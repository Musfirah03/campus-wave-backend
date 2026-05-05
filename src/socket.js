const { Server } = require('socket.io');
const jwt         = require('jsonwebtoken');
const Message     = require('./models/Message');
const Group       = require('./models/Group');

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

    socket.on('sendMessage', async ({ groupId, text, attachment }) => {
      console.log(`[socket] sendMessage userId=${socket.userId} groupId=${groupId} text="${text}"`);
      try {
        const group = await Group.findById(groupId).select('membersCanPost createdBy members');
        if (!group) {
          console.warn(`[socket] sendMessage — group not found: ${groupId}`);
          return socket.emit('messageError', { message: 'Group not found' });
        }

        const isMember = group.members.some((m) => m.toString() === socket.userId);
        if (!isMember) {
          console.warn(`[socket] sendMessage — not a member  userId=${socket.userId} groupId=${groupId}`);
          return socket.emit('messageError', { message: 'Not a member of this group' });
        }

        if (group.membersCanPost === false) {
          const isCreator = group.createdBy?.toString() === socket.userId;
          if (!isCreator) {
            return socket.emit('messageError', { message: 'This is an announcement channel. Only the creator can post.' });
          }
        }

        const data = { group: groupId, sender: socket.userId };
        if (text)       data.text       = text;
        if (attachment) data.attachment = attachment;

        const message   = await Message.create(data);
        const populated = await message.populate('sender', 'fullName profileImage');
        io.to(groupId).emit('receiveMessage', populated);
        console.log(`[socket] message saved & broadcast  msgId=${message._id}`);
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
        console.log(`[socket] message deleted  msgId=${messageId}`);
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
        console.log(`[socket] message edited  msgId=${messageId}`);
      } catch (err) {
        console.error('[socket] editMessage error:', err);
        socket.emit('messageError', { message: 'Failed to edit message' });
      }
    });
  });

  return io;
}

module.exports = initSocket;
