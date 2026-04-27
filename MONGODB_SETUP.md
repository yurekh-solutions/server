# UrbanAV Server - MongoDB Atlas Setup Guide

## ✅ MongoDB Atlas Configuration Complete!

Your MongoDB Atlas connection has been configured with the following credentials:

### Database Details:
- **Username:** `urbanavsolution`
- **Password:** `Yuvraj@2706`
- **Cluster:** `urbanav.ltlh8va.mongodb.net`
- **Database:** `urbanav`

### Connection String:
```
mongodb+srv://urbanavsolution:Yuvraj%402706@urbanav.ltlh8va.mongodb.net/urbanav?retryWrites=true&w=majority&appName=urbanav
```

## 🔒 Security Notes:

1. **Environment Variables**: Your credentials are stored in `.env` file
2. **Git Ignore**: `.env` file is in `.gitignore` and won't be committed
3. **Password Encoded**: The `@` symbol in password is URL-encoded as `%40`

## 📁 Files Created/Updated:

### ✅ Created:
- `server/.env` - Environment configuration with MongoDB credentials
- `server/.env.example` - Template for other developers
- `server/.gitignore` - Ensures `.env` is not committed

### ✅ Updated:
- `server/index.js` - Enhanced MongoDB connection with better logging

## 🚀 How to Start the Server:

```bash
cd server
npm install
npm start
```

### Expected Output:
```
✅ Connected to MongoDB Atlas - UrbanAV
🌍 Environment: development
📊 Database: urbanav.ltlh8va.mongodb.net

🚀 UrbanAV Server Running
📡 Port: 3002
🌐 Environment: development
🔗 API URL: http://localhost:3002
📱 Client URL: http://localhost:8081
🔌 WebSocket: http://localhost:3002
==================================================
```

## 🔧 Environment Variables:

| Variable | Description | Value |
|----------|-------------|-------|
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ Configured |
| `PORT` | Server port | 3002 |
| `JWT_SECRET` | JWT authentication secret | ✅ Set |
| `STRIPE_SECRET_KEY` | Stripe payment API key | ⚠️ Needs setup |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | ⚠️ Needs setup |
| `EMAIL_USER` | Email service username | ⚠️ Needs setup |
| `EMAIL_PASS` | Email service password | ⚠️ Needs setup |
| `CLIENT_URL` | Frontend application URL | http://localhost:8081 |

## 📝 Important Notes:

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use `.env.example`** - Share this with team members as a template
3. **Change passwords in production** - Use strong, unique passwords
4. **Enable IP whitelist** - Add your server IP in MongoDB Atlas Network Access

## 🔐 MongoDB Atlas Security Checklist:

- [x] Database user created (`urbanavsolution`)
- [x] IP address whitelisted (your current IP)
- [x] Connection string configured in `.env`
- [ ] Enable additional security features in production
- [ ] Set up database backups
- [ ] Configure monitoring alerts

## 🛠️ Troubleshooting:

### Connection Error?
1. Check if IP is whitelisted in MongoDB Atlas
2. Verify username and password in `.env`
3. Ensure `@` in password is encoded as `%40`
4. Check network connectivity

### Authentication Failed?
1. Verify database user credentials in MongoDB Atlas
2. Check if user has proper permissions (atlasAdmin)
3. Ensure password is correctly URL-encoded

## 📚 Additional Resources:

- MongoDB Atlas Dashboard: https://cloud.mongodb.com
- MongoDB Connection String Docs: https://docs.mongodb.com/manual/reference/connection-string/
- URL Encoding Tool: https://www.urlencoder.org/

---

**✅ Your MongoDB Atlas database is ready to use!**
