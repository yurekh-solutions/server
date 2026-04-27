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

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendNewOrderNotification,
};
