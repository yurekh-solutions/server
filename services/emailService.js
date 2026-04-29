const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send order confirmation email
const sendOrderConfirmation = async (buyerEmail, order) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: buyerEmail,
    subject: 'Order Confirmation - UrbanAV',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #9B59B6, #8E44AD); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 Order Confirmed!</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Thank you for your order!</h2>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
          <p><strong>Event Date:</strong> ${new Date(order.eventDate).toLocaleDateString()}</p>
          <h3>Equipment:</h3>
          <ul>
            ${order.items.map(item => `<li>${item.name} - $${item.price}/day</li>`).join('')}
          </ul>
          <p>You can track your order status in the UrbanAV app.</p>
        </div>
        <div style="padding: 20px; text-align: center; background: #333; color: white;">
          <p>UrbanAV - AV Equipment Rental Marketplace</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent to:', buyerEmail);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// Send order status update email
const sendOrderStatusUpdate = async (buyerEmail, order, newStatus) => {
  const statusMessages = {
    confirmed: 'Your order has been confirmed by the supplier!',
    delivered: 'Your equipment has been delivered!',
    completed: 'Your order has been completed. Thank you!',
    cancelled: 'Your order has been cancelled.',
  };

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: buyerEmail,
    subject: `Order Status Update - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #9B59B6, #8E44AD); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">📦 Order Update</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>${statusMessages[newStatus] || 'Your order status has been updated'}</h2>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>New Status:</strong> ${newStatus.toUpperCase()}</p>
          <p>Login to the UrbanAV app to view full details and chat with your supplier.</p>
        </div>
        <div style="padding: 20px; text-align: center; background: #333; color: white;">
          <p>UrbanAV - AV Equipment Rental Marketplace</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Order status email sent to:', buyerEmail);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// Send new order notification to supplier
const sendNewOrderNotification = async (supplierEmail, order) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: supplierEmail,
    subject: 'New Booking Request - UrbanAV',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #9B59B6, #8E44AD); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎯 New Booking Request</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>You have a new order request!</h2>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
          <p><strong>Event Date:</strong> ${new Date(order.eventDate).toLocaleDateString()}</p>
          <p>Login to the UrbanAV app to accept or reject this order.</p>
        </div>
        <div style="padding: 20px; text-align: center; background: #333; color: white;">
          <p>UrbanAV - AV Equipment Rental Marketplace</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('New order notification sent to supplier:', supplierEmail);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// Send KYC document submission notification to admin
const sendKycSubmissionNotification = async (adminEmail, vendor) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: `📋 New KYC Submission - ${vendor.businessName || vendor.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #9B59B6, #8E44AD); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">📋 New KYC Submission</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>A new vendor has submitted KYC documents</h2>
          <p><strong>Business Name:</strong> ${vendor.businessName || 'N/A'}</p>
          <p><strong>Contact:</strong> ${vendor.name} (${vendor.email})</p>
          <p><strong>Phone:</strong> ${vendor.phone || 'N/A'}</p>
          <p><strong>Products/Services:</strong> ${(vendor.productsOffered || []).join(', ') || 'N/A'}</p>
          <p><strong>Years in Business:</strong> ${vendor.yearsInBusiness || 'N/A'}</p>
          <p style="margin-top: 20px;">Login to the UrbanAV Admin panel to review and approve/reject this vendor.</p>
        </div>
        <div style="padding: 20px; text-align: center; background: #333; color: white;">
          <p>UrbanAV - AV Equipment Rental Marketplace</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('KYC submission notification sent to admin:', adminEmail);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// Send KYC approval email to vendor
const sendKycApprovalEmail = async (vendorEmail, vendor) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: vendorEmail,
    subject: '✅ KYC Approved - Welcome to UrbanAV!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #27AE60, #2ECC71); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 Congratulations!</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Your KYC documents have been approved!</h2>
          <p>Dear ${vendor.name},</p>
          <p>Your business <strong>${vendor.businessName || 'your business'}</strong> has been verified and approved on UrbanAV.</p>
          <p><strong>What's next?</strong></p>
          <ul>
            <li>✅ You can now log in to the UrbanAV Supplier app</li>
            <li>✅ Start adding your equipment and services</li>
            <li>✅ Receive booking requests from buyers</li>
            <li>✅ Manage orders and earn revenue</li>
          </ul>
          <p style="margin-top: 20px;">If you have any questions, feel free to contact our support team.</p>
          <p style="margin-top: 20px;"><strong>Best regards,</strong><br/>The UrbanAV Team</p>
        </div>
        <div style="padding: 20px; text-align: center; background: #333; color: white;">
          <p>UrbanAV - AV Equipment Rental Marketplace</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('KYC approval email sent to:', vendorEmail);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// Send KYC rejection email to vendor
const sendKycRejectionEmail = async (vendorEmail, vendor, reason) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: vendorEmail,
    subject: '❌ KYC Application Update - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #E74C3C, #C0392B); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">📋 KYC Application Update</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Dear ${vendor.name},</h2>
          <p>We've reviewed your KYC application for <strong>${vendor.businessName || 'your business'}</strong>.</p>
          <p style="background: #FFF3CD; padding: 15px; border-left: 4px solid #FFC107; border-radius: 4px;">
            <strong>Status:</strong> Unfortunately, your application requires attention.
          </p>
          ${reason ? `
            <p><strong>Reason:</strong></p>
            <p style="background: #F8D7DA; padding: 15px; border-left: 4px solid #DC3545; border-radius: 4px;">${reason}</p>
          ` : ''}
          <p><strong>What you can do:</strong></p>
          <ul>
            <li>📝 Review the feedback above</li>
            <li>🔄 Update your documents in the UrbanAV Supplier app</li>
            <li>📧 Contact support if you need clarification</li>
          </ul>
          <p style="margin-top: 20px;">You can resubmit your application after making the necessary changes.</p>
          <p style="margin-top: 20px;"><strong>Best regards,</strong><br/>The UrbanAV Team</p>
        </div>
        <div style="padding: 20px; text-align: center; background: #333; color: white;">
          <p>UrbanAV - AV Equipment Rental Marketplace</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('KYC rejection email sent to:', vendorEmail);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendNewOrderNotification,
  sendKycSubmissionNotification,
  sendKycApprovalEmail,
  sendKycRejectionEmail,
};
