import Message from "../models/Message.js";

const sendResponse = (res, status, success, data, message = null) => {
  console.log(`Chat Controller - Response: Status ${status}, Success: ${success}, Message: ${message}`);
  res.status(status).json({ success, ...data, message });
};

export const getMessages = async (req, res) => {
  const { contactId } = req.params;
  try {
    console.log(`Chat Controller - Fetching messages for user ${req.user._id} and contact ${contactId}`);
    if (!contactId) {
      return sendResponse(res, 400, false, {}, "Contact ID is required");
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: contactId },
        { sender: contactId, receiver: req.user._id },
      ],
    }).sort({ timestamp: 1 });

    console.log(`Chat Controller - Messages fetched: ${messages.length} messages`);
    sendResponse(res, 200, true, { messages }, "Messages retrieved successfully");
  } catch (error) {
    console.error("Chat Controller - Error:", error);
    sendResponse(res, 500, false, {}, `Server error: ${error.message}`);
  }
};