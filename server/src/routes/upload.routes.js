import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { Message } from "../models/index.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/json",
      "text/csv",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml"
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  }
});

router.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    const { room, sender, clerkId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const isImage = file.mimetype.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: `nexchat/${room}/files`,
          public_id: `${file.originalname.replace(/\.[^/.]+$/, "")}_${Date.now()}`,
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });

    const messageType = isImage ? "image" : "file";
    const fileMessage = new Message({
      room,
      sender,
      type: messageType,
      fileUrl: result.secure_url,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      timestamp: new Date()
    });

    if (isImage) {
      fileMessage.imageUrl = result.secure_url;
    }

    await fileMessage.save();

    const messageData = {
      id: fileMessage._id.toString(),
      room: fileMessage.room,
      sender: fileMessage.sender,
      type: messageType,
      fileUrl: fileMessage.fileUrl,
      fileName: fileMessage.fileName,
      fileSize: fileMessage.fileSize,
      fileType: fileMessage.fileType,
      timestamp: fileMessage.timestamp.toISOString(),
      reactions: {},
      edited: false,
      editedAt: null,
    };

    if (isImage) {
      messageData.imageUrl = fileMessage.imageUrl;
    }

    const io = req.app.get("io");
    if (io) {
      io.to(room).emit("receive_file", messageData);
    }

    console.log(`📎 File uploaded: ${file.originalname} to room ${room}`);

    res.json({ 
      success: true, 
      messageId: fileMessage._id,
      fileUrl: result.secure_url,
      message: messageData
    });

  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

router.get("/download/:messageId", async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message || !message.fileUrl) {
      return res.status(404).json({ error: "File not found" });
    }

    const response = await fetch(message.fileUrl);
    const buffer = await response.arrayBuffer();

    const fileName = message.fileName || "file";
    const fileType = message.fileType || "application/octet-stream";

    res.setHeader("Content-Type", fileType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.byteLength);
    res.setHeader("Cache-Control", "no-cache");
    
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

router.get("/file-info/:messageId", async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message || (message.type !== "file" && message.type !== "image")) {
      return res.status(404).json({ error: "File not found" });
    }
    
    res.json({
      fileName: message.fileName,
      fileType: message.fileType,
      fileSize: message.fileSize,
      fileUrl: message.fileUrl
    });
  } catch (error) {
    console.error("File info error:", error);
    res.status(500).json({ error: "Failed to fetch file info" });
  }
});

export default router;
