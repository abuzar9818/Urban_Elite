# Urban Elite - E-Commerce Platform

A full-featured e-commerce web application built with Node.js, Express, MongoDB, and EJS templating engine.

## 🚀 Features

### User Features
- **User Authentication**: Secure login and registration system
- **Product Browsing**: Browse products with filtering and sorting options
- **Product Reviews**: Customers can write and read product reviews (purchase required)
- **Wishlist**: Save products for later purchase
- **Shopping Cart**: Add/remove products from cart
- **Coupon System**: Apply discount coupons at checkout
- **Order Management**: View order history and status
- **Profile Management**: Update personal information and change password

### Admin Features
- **Admin Dashboard**: Overview of sales and products
- **Product Management**: Add, edit, and delete products
- **Order Management**: View and manage customer orders
- **Coupon Management**: Create and manage discount coupons
- **Low Stock Alerts**: Automatic notifications for low inventory

### Technical Features
- **Responsive Design**: Mobile-friendly interface
- **Session Management**: Secure user sessions
- **Database Integration**: MongoDB with Mongoose ODM
- **Flash Messages**: User feedback system
- **Image Upload**: Product image management
- **Search Functionality**: Product search capabilities

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Authentication**: bcrypt, express-session
- **Templating**: EJS (Embedded JavaScript)
- **Frontend**: HTML, CSS, JavaScript
- **Styling**: Custom CSS with responsive design
- **Security**: Cookie-parser, method-override
- **File Upload**: Multer
- **Environment**: dotenv for configuration

## 📦 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm (comes with Node.js)

## 🔧 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/scatch.git
   cd scatch
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory with the following:
   ```env
   # MongoDB Connection
   MONGODB_URI=your_mongodb_connection_string
   
   # Session Secret
   EXPRESS_SESSION_SECRET=your_secret_key_here
   
   # Admin Credentials
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=your_admin_password
   
   # Server Port
   PORT=3000
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

5. **Access the application**:
   Open your browser and go to `http://localhost:3000`

## 📁 Project Structure

```
scatch/
├── config/
│   ├── keys.js
│   ├── mongoose-connection.js
│   └── multer-config.js
├── controllers/
│   ├── authController.js
│   └── ownerController.js
├── middleware/
│   ├── isLoggedIn.js
│   ├── isOwnerLoggedIn.js
│   └── setUser.js
├── models/
│   ├── user-model.js
│   ├── owner-model.js
│   ├── product-model.js
│   ├── coupon-model.js
│   └── review-model.js
├── public/
│   ├── styles.css
│   ├── js/
│   └── uploads/
├── routes/
│   ├── index.js
│   ├── ownersRouter.js
│   ├── productsRouter.js
│   └── usersRouter.js
├── utils/
│   └── generateToken.js
├── views/
│   ├── partials/
│   ├── home.ejs
│   ├── shop.ejs
│   ├── product-detail.ejs
│   ├── cart.ejs
│   ├── checkout.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── myAccount.ejs
│   ├── myOrders.ejs
│   ├── myReviews.ejs
│   ├── wishlist.ejs
│   └── admin.ejs
├── app.js
├── package.json
└── .env
```

## 🎯 Key Features Explained

### Product Reviews System
- Users can only review products they've purchased
- Star rating system (1-5 stars)
- Review title and detailed comments
- Reviews are immediately visible after submission
- "My Reviews" page to view all submitted reviews

### Coupon System
Pre-configured sample coupons:
- **WELCOME10**: 10% off orders over ₹500 (30-day validity)
- **SAVE200**: ₹200 flat discount on orders over ₹1000 (15-day validity)
- **FREESHIP**: ₹20 discount (covers platform fee) on orders over ₹500 (60-day validity)
- **NEWERA**: ₹1000 discount on orders over ₹8000 (60-day validity)

### Shop Features
- Category filtering (New Collection, Discounted Products)
- Availability filtering (In Stock, On Sale)
- Sorting options (Popular, Newest, Price Low-High, Price High-Low)
- Search functionality
- Wishlist integration on product cards

### Security Features
- Password hashing with bcrypt
- Session-based authentication
- Input validation and sanitization
- Protected routes for authenticated users
- Admin-only access for management features

## 🚀 Usage

### For Customers
1. **Register/Login** - Create an account or login
2. **Browse Products** - Use filters and search to find products
3. **Add to Wishlist** - Save items for later
4. **Add to Cart** - Select products for purchase
5. **Apply Coupons** - Use discount codes at checkout
6. **Checkout** - Complete purchase with payment validation
7. **Review Products** - Share feedback on purchased items
8. **Manage Account** - Update profile and view order history

### For Admin
1. **Login** - Access admin panel with credentials
2. **Dashboard** - View sales overview and product analytics
3. **Product Management** - Add, edit, or remove products
4. **Order Management** - Process and track customer orders
5. **Coupon Management** - Create and manage discount codes
6. **Inventory Management** - Monitor stock levels and alerts

## 🐛 Common Issues

### Database Connection
If you encounter connection issues:
- Verify your MongoDB URI in `.env`
- Ensure MongoDB service is running
- Check network connectivity for Atlas clusters

### Session Issues
- Clear browser cookies if experiencing login problems
- Verify `EXPRESS_SESSION_SECRET` is set in `.env`

### File Upload Issues
- Ensure `public/uploads` directory exists and has write permissions
- Check file size limits in multer configuration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email [your-email@example.com] or create an issue in the repository.

## 🙏 Acknowledgments

- Thanks to all contributors who have helped with this project
- Inspired by modern e-commerce platforms
- Built with the amazing Node.js ecosystem

---

**Happy Shopping!** 🛍️
