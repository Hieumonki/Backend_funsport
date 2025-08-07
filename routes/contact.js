const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { contact: Contact } = require('../model/contact');

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, phone, email, message } = req.body;

  try {
    // 1. Lưu vào MongoDB
    const newContact = new Contact({ name, phone, email, message });
    await newContact.save();
    console.log('✅ Đã lưu liên hệ:', newContact);

    // 2. Gửi mail bằng Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hunghsps40750@gmail.com',         // 👉 Gmail bạn muốn gửi đi
        pass: 'qcbdfkdfbxrurfmw'                 // 👉 App Password (Không dùng password Gmail thường)
      }
    });

    const mailOptions = {
      from: email,
      to: 'hunghsps40750@gmail.com',           // 👉 Gmail nhận phản hồi
      subject: `Liên hệ từ: ${name}`,
      text: `Số điện thoại: ${phone}\nEmail: ${email}\nNội dung:${message}`
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Đã gửi email thông báo');

    res.status(200).json({ message: '✅ Gửi liên hệ và email thành công!' });
  } catch (err) {
    console.error('❌ Lỗi khi xử lý liên hệ:', err);
    res.status(500).json({ error: '❌ Lỗi server khi xử lý liên hệ' });
  }
});

module.exports = router;
