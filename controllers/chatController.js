import Message from "../models/Message.js";

export const sendMessage = async (req, res) => {
  const { receiver, content } = req.body;
  try {
    const message = new Message({
      sender: req.user._id,
      receiver,
      content,
    });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  const { contactId } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: contactId },
        { sender: contactId, receiver: req.user._id },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};