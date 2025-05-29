import Message from "../models/Message.js";

const sendResponse = (res, status, success, data, message = null) => {
  res.status(status).json({ success, ...data, message });
};

export const getMessages = async (req, res) => {
  const { contactId } = req.params;
  try {
    if (!contactId) {
      return sendResponse(res, 400, false, {}, "Contact ID is required");
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: contactId },
        { sender: contactId, receiver: req.user._id },
      ],
    }).sort({ createdAt: 1 });

    sendResponse(res, 200, true, { messages }, "Messages retrieved successfully");
  } catch (error) {
    sendResponse(res, 500, false, {}, `Server error: ${error.message}`);
  }
};