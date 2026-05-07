const { Server } = require('socket.io');
const jwt          = require('jsonwebtoken');
const Message      = require('./models/Message');
const Group        = require('./models/Group');
const User         = require('./models/User');
const Notification = require('./models/Notification');

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected  userId=${socket.userId}`);

    // Each user automatically joins their personal notification room
    socket.join(`user_${socket.userId}`);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected userId=${socket.userId} reason=${reason}`);
    });

    socket.on('joinGroup', (groupId) => {
      console.log(`[socket] joinGroup  userId=${socket.userId} groupId=${groupId}`);
      socket.join(groupId);
    });

    socket.on('leaveGroup', (groupId) => {
      socket.leave(groupId);
    });

    socket.on('sendMessage', async ({ groupId, text, attachment, replyTo, invite }) => {
      console.log(`[socket] sendMessage userId=${socket.userId} groupId=${groupId} replyTo=${replyTo ?? 'none'}`);
      try {
        const group = await Group.findById(groupId).select('name type membersCanPost createdBy members autoEnrolled');
        if (!group) {
          return socket.emit('messageError', { message: 'Group not found' });
        }

        const isMember = group.members.some((m) => m.toString() === socket.userId);
        if (!isMember) {
          return socket.emit('messageError', { message: 'Not a member of this group' });
        }

        if (group.membersCanPost === false) {
          const isCreator = group.createdBy?.toString() === socket.userId;
          if (!isCreator) {
            return socket.emit('messageError', { message: 'This is an announcement channel. Only the creator can post.' });
          }
        }

        // Only teachers/admins can send attachments in auto-enrolled groups
        if (attachment && group.autoEnrolled) {
          const sender = await User.findById(socket.userId).select('role');
          if (sender?.role === 'student') {
            return socket.emit('messageError', { message: 'Only teachers can share files in this group' });
          }
        }

        // Validate replyTo belongs to this group
        let replyToId = null;
        if (replyTo) {
          const original = await Message.findOne({ _id: replyTo, group: groupId }).select('_id');
          if (original) replyToId = original._id;
        }

        const msgData = { group: groupId, sender: socket.userId };
        if (text)       msgData.text       = text;
        if (attachment) msgData.attachment = attachment;
        if (replyToId)  msgData.replyTo    = replyToId;
        if (invite?.groupId) {
          const inviteGroup = await Group.findById(invite.groupId).select('name type');
          if (inviteGroup) {
            msgData.invite = { groupId: inviteGroup._id, groupName: inviteGroup.name, groupType: inviteGroup.type };
          }
        }

        const message   = await Message.create(msgData);
        const populated = await message.populate([
          { path: 'sender',  select: 'fullName profileImage' },
          { path: 'replyTo', select: 'text sender', populate: { path: 'sender', select: 'fullName' } },
          { path: 'invite.groupId', select: 'name type' },
        ]);

        io.to(groupId).emit('receiveMessage', populated);
        console.log(`[socket] message saved & broadcast  msgId=${message._id}`);

        await _sendMessageNotifications(io, {
          group,
          message: populated,
          senderId: socket.userId,
        });
      } catch (err) {
        console.error('[socket] sendMessage error:', err);
        socket.emit('messageError', { message: 'Failed to send message' });
      }
    });

    socket.on('deleteMessage', async ({ messageId }) => {
      try {
        const msg = await Message.findById(messageId).select('sender group');
        if (!msg) return socket.emit('messageError', { message: 'Message not found' });
        if (msg.sender.toString() !== socket.userId) {
          return socket.emit('messageError', { message: 'Not your message' });
        }
        await Message.findByIdAndDelete(messageId);
        io.to(msg.group.toString()).emit('messageDeleted', { messageId });
      } catch (err) {
        console.error('[socket] deleteMessage error:', err);
        socket.emit('messageError', { message: 'Failed to delete message' });
      }
    });

    socket.on('editMessage', async ({ messageId, text }) => {
      try {
        const trimmed = text?.trim();
        if (!trimmed) return socket.emit('messageError', { message: 'Text cannot be empty' });
        const msg = await Message.findById(messageId).select('sender group');
        if (!msg) return socket.emit('messageError', { message: 'Message not found' });
        if (msg.sender.toString() !== socket.userId) {
          return socket.emit('messageError', { message: 'Not your message' });
        }
        const updated = await Message.findByIdAndUpdate(
          messageId,
          { text: trimmed },
          { new: true, timestamps: true },
        );
        io.to(msg.group.toString()).emit('messageEdited', {
          messageId,
          text:      updated.text,
          updatedAt: updated.updatedAt,
        });
      } catch (err) {
        console.error('[socket] editMessage error:', err);
        socket.emit('messageError', { message: 'Failed to edit message' });
      }
    });
  });

  return io;
}

async function _sendMessageNotifications(io, { group, message, senderId }) {
  try {
    const isDM       = group.type === 'dm';
    const senderName = message.sender?.fullName ?? 'Someone';
    const preview    = message.text
      ? message.text.slice(0, 80)
      : (message.attachment?.name ?? 'Sent an attachment');
    const groupName  = group.name;

    // All members except the sender — fetch with push tokens
    const recipientDocs = await User.find({
      _id: { $in: group.members.filter((m) => m.toString() !== senderId) },
    }).select('_id expoPushToken');

    if (recipientDocs.length === 0) return;

    // If this is a reply, the original message author gets a dedicated reply notification
    let replyTargetId = null;
    if (message.replyTo?.sender) {
      const rawId = message.replyTo.sender._id ?? message.replyTo.sender;
      replyTargetId = rawId.toString();

      const replyRecipient = recipientDocs.find((u) => u._id.toString() === replyTargetId);
      if (replyRecipient) {
        const replyTitle = isDM ? senderName : `${senderName} replied to you`;
        const replyBody  = isDM ? `"${preview}"` : preview;

        const replyDoc = await Notification.create({
          recipient: replyTargetId,
          type:      'reply',
          title:     replyTitle,
          body:      replyBody,
          data:      { groupId: group._id, groupName, senderId },
          read:      false,
        });
        io.to(`user_${replyTargetId}`).emit('newNotification', replyDoc);
        if (replyRecipient.expoPushToken) {
          await _sendExpoPush([replyRecipient.expoPushToken], replyTitle, replyBody, { groupId: group._id.toString(), groupName });
        }
      }
    }

    const regularRecipients = recipientDocs.filter((u) => u._id.toString() !== replyTargetId);
    if (regularRecipients.length === 0) return;

    const type  = isDM ? 'dm' : 'message';
    const title = isDM ? senderName : `${senderName} in ${group.name}`;
    const body  = isDM ? `"${preview}"` : preview;

    const docs = await Notification.insertMany(
      regularRecipients.map((u) => ({
        recipient: u._id,
        type,
        title,
        body,
        data: { groupId: group._id, groupName, senderId },
        read: false,
      })),
    );

    for (const doc of docs) {
      io.to(`user_${doc.recipient}`).emit('newNotification', doc);
    }

    const pushTokens = regularRecipients.map((u) => u.expoPushToken).filter(Boolean);
    if (pushTokens.length > 0) {
      await _sendExpoPush(pushTokens, title, body, { groupId: group._id.toString(), groupName });
    }
  } catch (err) {
    console.error('[socket] notification fan-out error:', err);
  }
}

async function _sendExpoPush(tokens, title, body, data) {
  try {
    const messages = tokens
      .filter((t) => t && t.startsWith('ExponentPushToken'))
      .map((to) => ({ to, title, body, data, sound: 'default' }));
    if (messages.length === 0) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify(messages),
    });
  } catch (err) {
    console.error('[push] expo push error:', err);
  }
}

module.exports = initSocket;
