# Ad Management Platform - Client Portal

A comprehensive client portal for managing digital advertising campaigns with Supabase backend integration. This platform provides end-to-end campaign management, media upload, analytics, billing, and creative services marketplace.

## 🚀 Features

### 📤 Media Upload & Management
- **File Upload**: Support for JPG/PNG images (≤10MB) and MP4 videos (≤500MB, ≤15s)
- **Validation**: Automatic validation of 1080×1920 or 2160×3840 resolution with 9:16 aspect ratio
- **Storage**: Secure file storage with Supabase Storage
- **Preview**: Vertical preview window for HD and 4K content
- **Bulk Upload**: Multiple file upload with progress tracking

### 📅 Campaign Management
- **Campaign Creation**: Set start/end dates, budget, and targeting
- **Scheduling**: Flexible campaign scheduling with status management
- **Budget Control**: Daily and total budget limits with real-time monitoring
- **Targeting**: Location-based and demographic targeting options
- **Status Tracking**: Draft, pending, active, paused, completed, rejected states

### 🎨 Creative Services Marketplace
- **Service Categories**: Image design, video production, brand identity, copywriting
- **Customization**: Rush delivery, additional revisions, source files, commercial licenses
- **Order Management**: Track service orders with milestone tracking
- **Pricing**: Transparent pricing with customization costs

### 📊 Analytics & Reporting
- **Real-time Metrics**: Impressions, clicks, play rates, completion rates
- **Performance Tracking**: Campaign performance over time with detailed breakdowns
- **Location Analytics**: Geographic performance insights
- **Device Analytics**: Cross-device performance metrics
- **Export Options**: CSV and JSON data export

### 💳 Billing & Payments
- **Invoice Management**: Automated invoice generation and tracking
- **Payment Methods**: Secure payment method storage and management
- **Stripe Integration**: Ready for Stripe payment processing
- **Coupon Codes**: Support for percentage, fixed, and free placement discounts
- **Billing History**: Complete billing and payment history

### 🔒 Security & Access Control
- **Row Level Security**: Supabase RLS policies for data isolation
- **User Authentication**: Secure user authentication and session management
- **File Access Control**: User-specific file access and management
- **Audit Trail**: Complete activity logging and tracking

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **Database**: PostgreSQL with advanced constraints and triggers
- **File Storage**: Supabase Storage with automatic validation
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Supabase real-time subscriptions
- **Payment**: Stripe integration ready

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Modern web browser with ES6+ support

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd AdManagement
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 4. Database Setup
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the SQL script to create all tables, functions, and policies

### 5. Storage Bucket Setup
The schema will automatically create the required storage buckets:
- `media-assets`: For user-uploaded media files
- `campaign-content`: For campaign-specific content

### 6. Start Development Server
```bash
npm run dev
```

## 🗄️ Database Schema

### Core Tables
- **profiles**: User profiles and subscription information
- **campaigns**: Campaign details and scheduling
- **media_assets**: Uploaded media files with metadata
- **campaign_media**: Campaign-media relationships
- **analytics_events**: Performance tracking events
- **invoices**: Billing and payment records
- **payment_methods**: Stored payment methods
- **coupon_codes**: Discount and promotional codes
- **creative_services**: Marketplace service listings
- **service_orders**: Creative service orders

### Key Features
- **Automatic Validation**: Database triggers for file size and dimension validation
- **Row Level Security**: Comprehensive RLS policies for data isolation
- **Real-time Updates**: Optimized for real-time data synchronization
- **Performance Indexes**: Strategic database indexing for optimal performance

## 📱 Usage Guide

### Media Upload
1. Navigate to the Upload section
2. Drag and drop files or click to browse
3. Files are automatically validated for:
   - File type (JPG/PNG for images, MP4 for videos)
   - File size limits
   - Resolution requirements (1080×1920 or 2160×3840)
   - Aspect ratio (9:16 portrait)
   - Video duration (≤15 seconds)
4. Monitor upload progress and validation status
5. Files are stored securely in Supabase Storage

### Campaign Management
1. Create new campaigns with scheduling and budget
2. Upload and assign media assets to campaigns
3. Set targeting parameters and demographics
4. Monitor campaign performance in real-time
5. Pause, resume, or modify campaigns as needed

### Analytics Dashboard
1. View real-time campaign performance metrics
2. Analyze performance trends over time
3. Compare media asset performance
4. Export data for external analysis
5. Monitor location and device performance

### Creative Services
1. Browse available creative services
2. Customize services with add-ons
3. Place orders with detailed requirements
4. Track order progress and milestones
5. Receive final deliverables

### Billing & Payments
1. View invoice history and payment status
2. Manage payment methods securely
3. Apply coupon codes for discounts
4. Monitor spending and budget usage
5. Download invoices and payment receipts

## 🔧 Configuration

### File Validation Settings
Modify `src/utils/fileValidation.ts` to adjust:
- File size limits
- Allowed file types
- Resolution requirements
- Aspect ratio constraints

### Storage Configuration
Configure Supabase Storage policies in the database schema:
- Public access for approved media
- User-specific upload permissions
- Automatic cleanup policies

### Analytics Tracking
Customize analytics events in `src/services/analyticsService.ts`:
- Event types and properties
- Performance metrics calculation
- Data export formats

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables for Production
Ensure all environment variables are set in your production environment:
- Supabase credentials
- Stripe keys (if using payment processing)
- Domain and security settings

### Supabase Production Setup
1. Create a production Supabase project
2. Run the schema migration
3. Configure production storage policies
4. Set up production authentication settings

## 🔒 Security Considerations

- **File Validation**: Server-side validation of all uploaded files
- **Access Control**: Row-level security for all database operations
- **Authentication**: JWT-based authentication with secure session management
- **File Storage**: Secure file access with user-specific permissions
- **Data Encryption**: All sensitive data encrypted in transit and at rest

## 📊 Performance Optimization

- **Database Indexes**: Strategic indexing for common query patterns
- **File Compression**: Automatic image and video optimization
- **Caching**: Browser and CDN caching for static assets
- **Lazy Loading**: Progressive loading of media content
- **Real-time Updates**: Efficient real-time data synchronization

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information
- Contact the development team

## 🔮 Future Enhancements

- **AI-powered Content Optimization**: Automatic content analysis and optimization
- **Advanced Targeting**: Machine learning-based audience targeting
- **Multi-language Support**: Internationalization and localization
- **Mobile App**: Native mobile applications for iOS and Android
- **API Integration**: Third-party platform integrations
- **Advanced Analytics**: Predictive analytics and insights

## 📈 Monitoring & Maintenance

- **Performance Monitoring**: Track application performance metrics
- **Error Tracking**: Monitor and resolve application errors
- **Database Maintenance**: Regular database optimization and cleanup
- **Security Updates**: Regular security patches and updates
- **Backup Management**: Automated database and file backups

---

**Note**: This platform is designed for production use with proper security measures. Always test thoroughly in a staging environment before deploying to production.

