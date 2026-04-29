const mongoose = require('mongoose');
const User = require('../models/User');
const Equipment = require('../models/Equipment');
require('dotenv').config();

// Sample suppliers
const suppliers = [
  {
    email: 'proav@urbanav.com',
    password: 'password123',
    name: 'ProAV Solutions',
    phone: '+919876543210',
    userType: 'supplier',
    businessName: 'ProAV Solutions',
    businessDescription: 'Premium projectors, LED walls, and screens',
  },
  {
    email: 'soundmaster@urbanav.com',
    password: 'password123',
    name: 'SoundMaster Events',
    phone: '+919876543211',
    userType: 'supplier',
    businessName: 'SoundMaster Events',
    businessDescription: 'Professional sound systems and microphones',
  },
  {
    email: 'djpro@urbanav.com',
    password: 'password123',
    name: 'DJ Pro Rentals',
    phone: '+919876543212',
    userType: 'supplier',
    businessName: 'DJ Pro Rentals',
    businessDescription: 'DJ equipment and stage lighting',
  },
  {
    email: 'techvision@urbanav.com',
    password: 'password123',
    name: 'TechVision',
    phone: '+919876543213',
    userType: 'supplier',
    businessName: 'TechVision',
    businessDescription: 'Video recording and cables & accessories',
  },
  {
    email: 'buyer@test.com',
    password: 'password123',
    name: 'Test Buyer',
    phone: '+919876543214',
    userType: 'buyer',
  },
  // Supplier demo account
  {
    email: 'supplier@test.com',
    password: 'password123',
    name: 'Demo Supplier',
    phone: '+919876543215',
    userType: 'supplier',
    businessName: 'Demo Supplier Co.',
    businessDescription: 'Demo AV equipment supplier account',
  },
];

// Equipment data from your existing database
const equipmentData = [
  // PROJECTORS - ProAV Solutions
  { name: 'Epson EB-E01 3300 Lumens Projector', category: 'projectors', subcategory: 'Standard Projectors', description: 'Reliable 3300 lumens XGA projector perfect for small to medium meetings', basePrice: 1200, minPrice: 800, maxPrice: 1500, priceUnit: 'day', specs: ['3300 Lumens', 'XGA 1024x768', '15000:1 Contrast', 'HDMI/VGA Input'], tags: ['projector', 'epson', '3300 lumens', 'xga', 'office'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=Epson+EB-E01'] },
  { name: 'Epson EB-FH52 4000 Lumens Full HD', category: 'projectors', subcategory: 'HD Projectors', description: 'Full HD 1080p projector with 4000 lumens brightness', basePrice: 2500, minPrice: 1800, maxPrice: 3200, priceUnit: 'day', specs: ['4000 Lumens', 'Full HD 1080p', '16000:1 Contrast', 'Built-in Speaker'], tags: ['projector', 'epson', '4000 lumens', 'full hd'], popular: true, images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=Epson+FH52'] },
  { name: 'BenQ TK700STi 4K HDR Gaming Projector', category: 'projectors', subcategory: '4K Projectors', description: 'True 4K UHD HDR projector with 3000 lumens', basePrice: 4500, minPrice: 3500, maxPrice: 6000, priceUnit: 'day', specs: ['3000 Lumens', '4K UHD 3840x2160', 'HDR10 Support', 'Android TV'], tags: ['projector', 'benq', '4k', 'hdr', 'gaming'], popular: true, images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=BenQ+4K'] },
  { name: 'Epson EB-L530U 5200 Lumens Laser', category: 'projectors', subcategory: 'Large Venue', description: 'High-brightness WUXGA laser projector for large venues', basePrice: 8000, minPrice: 6000, maxPrice: 10000, priceUnit: 'day', specs: ['5200 Lumens', 'WUXGA 1920x1200', 'Laser Light Source', '20000 Hours Life'], tags: ['projector', 'epson', '5200 lumens', 'laser'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=Epson+Laser'] },
  { name: 'ViewSonic PS501X Short Throw', category: 'projectors', subcategory: 'Short Throw', description: 'Short throw projector for small rooms', basePrice: 2000, minPrice: 1500, maxPrice: 2800, priceUnit: 'day', specs: ['3500 Lumens', 'XGA 1024x768', '0.61 Short Throw', '3D Ready'], tags: ['projector', 'viewsonic', 'short throw'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=ViewSonic'] },
  { name: 'Epson EB-700U Ultra Short Throw', category: 'projectors', subcategory: 'Ultra Short Throw', description: 'Ultra short throw laser projector with interactive features', basePrice: 5500, minPrice: 4000, maxPrice: 7000, priceUnit: 'day', specs: ['4000 Lumens', 'WUXGA', 'Ultra Short Throw', 'Interactive Pen'], tags: ['projector', 'epson', 'ultra short throw'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=Epson+UST'] },
  { name: 'Panasonic PT-RZ990 9400 Lumens Laser', category: 'projectors', subcategory: 'Large Venue', description: 'Professional large venue laser projector', basePrice: 15000, minPrice: 12000, maxPrice: 20000, priceUnit: 'day', specs: ['9400 Lumens', 'WUXGA', 'Laser 20000h', '4K Signal Input'], tags: ['projector', 'panasonic', '9400 lumens', 'concert'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=Panasonic'] },

  // LED WALLS - ProAV Solutions
  { name: 'P2.5 Indoor LED Wall (1sqm)', category: 'led-walls', subcategory: 'Indoor LED P2', description: 'High-resolution P2.5 LED wall for indoor events', basePrice: 3500, minPrice: 2500, maxPrice: 5000, priceUnit: 'day', specs: ['P2.5 Pixel Pitch', '3840Hz Refresh', '160000 dots/sqm', '5000 nits'], tags: ['led wall', 'p2.5', 'indoor', 'conference'], popular: true, images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=LED+P2.5'] },
  { name: 'P3 Indoor LED Wall (1sqm)', category: 'led-walls', subcategory: 'Indoor LED P3', description: 'Versatile P3 LED wall for indoor events', basePrice: 2800, minPrice: 2000, maxPrice: 4000, priceUnit: 'day', specs: ['P3 Pixel Pitch', '3840Hz Refresh', '111111 dots/sqm', '4500 nits'], tags: ['led wall', 'p3', 'indoor', 'stage'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=LED+P3'] },
  { name: 'P4 Indoor LED Wall (1sqm)', category: 'led-walls', subcategory: 'Indoor LED P4', description: 'Cost-effective P4 LED wall for indoor use', basePrice: 2000, minPrice: 1500, maxPrice: 3000, priceUnit: 'day', specs: ['P4 Pixel Pitch', '1920Hz Refresh', '62500 dots/sqm', '4000 nits'], tags: ['led wall', 'p4', 'indoor', 'budget'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=LED+P4'] },
  { name: 'P3.91 Outdoor LED Wall (1sqm)', category: 'led-walls', subcategory: 'Outdoor LED', description: 'Weatherproof outdoor LED wall for concerts', basePrice: 4500, minPrice: 3500, maxPrice: 6000, priceUnit: 'day', specs: ['P3.91 Pixel Pitch', 'IP65 Waterproof', '5500 nits', '500x500mm Panels'], tags: ['led wall', 'outdoor', 'waterproof', 'concert'], popular: true, images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=LED+Outdoor'] },
  { name: 'P4.81 Outdoor LED Wall (1sqm)', category: 'led-walls', subcategory: 'Outdoor LED', description: 'Rugged outdoor LED wall for festivals', basePrice: 3500, minPrice: 2800, maxPrice: 5000, priceUnit: 'day', specs: ['P4.81 Pixel Pitch', 'IP65 Waterproof', '6000 nits', '500x500mm Panels'], tags: ['led wall', 'outdoor', 'festival'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=LED+Festival'] },
  { name: 'Curved LED Wall P2.9 (Flexible)', category: 'led-walls', subcategory: 'Curved LED', description: 'Flexible curved LED wall for creative stages', basePrice: 5000, minPrice: 4000, maxPrice: 7000, priceUnit: 'day', specs: ['P2.9 Pixel Pitch', 'Curved ±15°', '3840Hz Refresh', 'Magnetic Modules'], tags: ['led wall', 'curved', 'flexible'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=LED+Curved'] },
  { name: 'Transparent LED Wall P3.9', category: 'led-walls', subcategory: 'Transparent LED', description: 'See-through LED wall for retail installations', basePrice: 8000, minPrice: 6000, maxPrice: 12000, priceUnit: 'day', specs: ['P3.9 Pixel Pitch', '70% Transparency', '4500 nits', 'Lightweight'], tags: ['led wall', 'transparent', 'retail'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=LED+Transparent'] },

  // SOUND SYSTEMS - SoundMaster Events
  { name: 'Basic PA System (100W)', category: 'sound-systems', subcategory: 'PA Systems', description: 'Compact PA system for small meetings', basePrice: 1500, minPrice: 1000, maxPrice: 2500, priceUnit: 'day', specs: ['100W Output', '2 Speakers', 'Wired Mic', 'Bluetooth'], tags: ['pa system', '100w', 'small'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=PA+100W'] },
  { name: 'Standard PA System (500W)', category: 'sound-systems', subcategory: 'PA Systems', description: 'Powerful 500W PA system for medium events', basePrice: 3500, minPrice: 2500, maxPrice: 5000, priceUnit: 'day', specs: ['500W Output', '2 Speakers', '2 Wireless Mics', 'Mixer'], tags: ['pa system', '500w', 'event'], popular: true, images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=PA+500W'] },
  { name: 'Professional PA System (1000W)', category: 'sound-systems', subcategory: 'PA Systems', description: 'High-power 1000W system for large events', basePrice: 8000, minPrice: 6000, maxPrice: 12000, priceUnit: 'day', specs: ['1000W Output', '4 Speakers', '4 Wireless Mics', 'Digital Mixer'], tags: ['pa system', '1000w', 'concert'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=PA+1000W'] },
  { name: 'Line Array System (2000W)', category: 'sound-systems', subcategory: 'Line Array', description: 'Concert-grade line array for outdoor events', basePrice: 15000, minPrice: 12000, maxPrice: 25000, priceUnit: 'day', specs: ['2000W Output', '8 Line Array Speakers', 'Subwoofers', 'Digital Processor'], tags: ['line array', '2000w', 'concert'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=Line+Array'] },
  { name: 'JBL EON615 Portable Speaker Pair', category: 'sound-systems', subcategory: 'Portable Speakers', description: 'Premium portable speakers with built-in amps', basePrice: 3000, minPrice: 2200, maxPrice: 4500, priceUnit: 'day', specs: ['1000W Peak', '15 inch Woofer', 'Bluetooth', 'DSP'], tags: ['speaker', 'jbl', 'portable'], popular: true, images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=JBL+EON'] },
  { name: 'Dual 18 inch Subwoofer', category: 'sound-systems', subcategory: 'Subwoofers', description: 'Powerful subwoofer for deep bass', basePrice: 4000, minPrice: 3000, maxPrice: 6000, priceUnit: 'day', specs: ['2000W Peak', 'Dual 18 inch', 'Active Powered', 'Pole Mount'], tags: ['subwoofer', '18 inch', 'bass'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=Subwoofer'] },
  { name: 'Stage Monitor Wedge (12 inch)', category: 'sound-systems', subcategory: 'Stage Monitors', description: 'Floor monitor for performers on stage', basePrice: 1500, minPrice: 1000, maxPrice: 2500, priceUnit: 'day', specs: ['500W Peak', '12 inch Woofer', 'Active', 'Angled Design'], tags: ['monitor', 'stage', 'performer'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=Monitor'] },

  // MICROPHONES - SoundMaster Events
  { name: 'Shure SM58 Wireless Handheld', category: 'microphones', subcategory: 'Wireless Handheld', description: 'Industry-standard wireless vocal microphone', basePrice: 1200, minPrice: 800, maxPrice: 2000, priceUnit: 'day', specs: ['UHF Wireless', 'Cardioid Pattern', '8h Battery', '100m Range'], tags: ['shure', 'sm58', 'wireless', 'vocal'], popular: true, images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=SM58'] },
  { name: 'Sennheiser EW 135 G4 Wireless', category: 'microphones', subcategory: 'Wireless Handheld', description: 'Professional German wireless microphone', basePrice: 2000, minPrice: 1500, maxPrice: 3000, priceUnit: 'day', specs: ['True Diversity', '1680 Frequencies', '8h Battery', 'Professional'], tags: ['sennheiser', 'wireless', 'professional'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=Sennheiser'] },
  { name: 'Shure BLX14 Wireless Lapel Mic', category: 'microphones', subcategory: 'Wireless Lapel', description: 'Discreet lapel microphone for presentations', basePrice: 1500, minPrice: 1000, maxPrice: 2500, priceUnit: 'day', specs: ['Lapel Clip-on', '14h Battery', '300ft Range', 'Clear Audio'], tags: ['shure', 'lapel', 'wireless'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=Lapel+Mic'] },
  { name: 'AKG C417 L Professional Lapel', category: 'microphones', subcategory: 'Wireless Lapel', description: 'Broadcast-quality lapel microphone', basePrice: 1800, minPrice: 1200, maxPrice: 2800, priceUnit: 'day', specs: ['Omnidirectional', 'Condenser', 'Low Profile', 'Broadcast Quality'], tags: ['akg', 'lapel', 'broadcast'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=AKG+Lapel'] },
  { name: 'Shure SM58 Wired Microphone', category: 'microphones', subcategory: 'Wired Mics', description: 'Legendary wired vocal microphone', basePrice: 500, minPrice: 300, maxPrice: 800, priceUnit: 'day', specs: ['Cardioid', 'XLR Connection', 'Durable', 'Industry Standard'], tags: ['shure', 'sm58', 'wired'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=SM58+Wired'] },
  { name: 'Shure SM57 Instrument Mic', category: 'microphones', subcategory: 'Wired Mics', description: 'Versatile microphone for instruments', basePrice: 500, minPrice: 300, maxPrice: 800, priceUnit: 'day', specs: ['Cardioid', 'Instrument Focused', 'XLR', 'Rugged'], tags: ['shure', 'sm57', 'instrument'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=SM57'] },
  { name: 'Conference Microphone System (4 mics)', category: 'microphones', subcategory: 'Conference Mics', description: 'Complete conference room microphone setup', basePrice: 4000, minPrice: 3000, maxPrice: 6000, priceUnit: 'day', specs: ['4 Gooseneck Mics', 'Central Hub', 'Mute Buttons', 'Clear Audio'], tags: ['conference', 'gooseneck', 'meeting'], images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=Conference'] },
  { name: 'Karaoke Microphone Set (2 Wireless)', category: 'microphones', subcategory: 'Karaoke Mics', description: 'Fun karaoke microphone pair for parties', basePrice: 1500, minPrice: 1000, maxPrice: 2500, priceUnit: 'day', specs: ['2 Wireless Mics', 'Echo Effect', '6h Battery', 'Colorful LEDs'], tags: ['karaoke', 'wireless', 'party'], popular: true, images: ['https://via.placeholder.com/400x300/8E44AD/FFFFFF?text=Karaoke'] },

  // DJ EQUIPMENT - DJ Pro Rentals
  { name: 'Pioneer DDJ-FLX4 DJ Controller', category: 'dj-equipment', subcategory: 'DJ Controllers', description: 'Entry-level Pioneer DJ controller', basePrice: 2500, minPrice: 1800, maxPrice: 3500, priceUnit: 'day', specs: ['2 Channels', 'rekordbox/Serato', 'USB Powered', 'Beginner Friendly'], tags: ['dj', 'pioneer', 'controller'], popular: true, images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=DDJ-FLX4'] },
  { name: 'Pioneer DDJ-1000 DJ Controller', category: 'dj-equipment', subcategory: 'DJ Controllers', description: 'Professional 4-channel DJ controller', basePrice: 5000, minPrice: 4000, maxPrice: 7000, priceUnit: 'day', specs: ['4 Channels', 'Full Size Jogs', 'rekordbox', 'Club Standard'], tags: ['dj', 'pioneer', 'professional'], images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=DDJ-1000'] },
  { name: 'Pioneer DJM-900NXS2 Mixer', category: 'dj-equipment', subcategory: 'DJ Mixers', description: 'Industry-standard club mixer with effects', basePrice: 6000, minPrice: 4500, maxPrice: 8000, priceUnit: 'day', specs: ['4 Channels', '64-bit Processing', 'Built-in FX', 'Sound Color FX'], tags: ['dj', 'mixer', 'pioneer', 'club'], images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=DJM-900'] },
  { name: 'Pioneer CDJ-3000 Media Player', category: 'dj-equipment', subcategory: 'CDJs', description: 'Latest generation professional media player', basePrice: 8000, minPrice: 6000, maxPrice: 12000, priceUnit: 'day', specs: ['MP3/WAV/AIFF', '9 inch Touchscreen', 'Pro DJ Link', 'Key Shift'], tags: ['dj', 'cdj', 'pioneer'], images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=CDJ-3000'] },
  { name: 'Technics SL-1200MK7 Turntable', category: 'dj-equipment', subcategory: 'Turntables', description: 'Legendary direct-drive turntable', basePrice: 4000, minPrice: 3000, maxPrice: 6000, priceUnit: 'day', specs: ['Direct Drive', 'Pitch Control', 'Reverse Play', 'Legendary'], tags: ['dj', 'turntable', 'vinyl'], images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=SL-1200'] },
  { name: 'Complete DJ Package (Controller + Speakers)', category: 'dj-equipment', subcategory: 'DJ Packages', description: 'Everything needed for a DJ event', basePrice: 8000, minPrice: 6000, maxPrice: 12000, priceUnit: 'day', specs: ['DJ Controller', '2 Speakers', 'Stands', 'Cables', 'Microphone'], tags: ['dj', 'package', 'complete'], popular: true, images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=DJ+Package'] },

  // LIGHTING - DJ Pro Rentals
  { name: 'LED PAR Can (RGBW)', category: 'lighting', subcategory: 'PAR Lights', description: 'Colorful LED PAR light for stage washing', basePrice: 800, minPrice: 500, maxPrice: 1200, priceUnit: 'day', specs: ['RGBW Colors', 'DMX Control', 'Auto Programs', 'Quiet Fan'], tags: ['light', 'par', 'rgbw'], images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=LED+PAR'] },
  { name: 'Moving Head Beam 7R', category: 'lighting', subcategory: 'Moving Heads', description: 'Powerful moving head for dynamic effects', basePrice: 3000, minPrice: 2000, maxPrice: 4500, priceUnit: 'day', specs: ['230W Lamp', 'DMX512', 'Gobo Wheel', 'Prism Effects'], tags: ['light', 'moving head', 'beam'], images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=Moving+Head'] },
  { name: 'LED Uplight (Wireless)', category: 'lighting', subcategory: 'Uplights', description: 'Battery-powered uplight for venue decoration', basePrice: 1000, minPrice: 700, maxPrice: 1500, priceUnit: 'day', specs: ['Battery Powered', 'RGB Colors', 'Wireless DMX', '8h Runtime'], tags: ['light', 'uplight', 'wireless'], popular: true, images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=Uplight'] },
  { name: 'Follow Spot 1200W', category: 'lighting', subcategory: 'Follow Spots', description: 'Professional follow spot for performers', basePrice: 4000, minPrice: 3000, maxPrice: 6000, priceUnit: 'day', specs: ['1200W Lamp', 'Iris Control', 'Color Filters', 'Long Throw'], tags: ['light', 'follow spot'], images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=Follow+Spot'] },
  { name: 'Laser Light RGB 1W', category: 'lighting', subcategory: 'Laser Lights', description: 'Eye-catching laser effects for parties', basePrice: 2500, minPrice: 1800, maxPrice: 4000, priceUnit: 'day', specs: ['1W RGB Laser', 'Pattern Effects', 'DMX/Auto', 'Safety Certified'], tags: ['light', 'laser', 'party'], images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=Laser'] },
  { name: 'Fog Machine 1500W', category: 'lighting', subcategory: 'Fog Machines', description: 'Create atmospheric fog effects', basePrice: 1500, minPrice: 1000, maxPrice: 2500, priceUnit: 'day', specs: ['1500W Heater', 'Wireless Remote', 'Fast Heat', 'Durable Pump'], tags: ['fog', 'machine', 'atmosphere'], images: ['https://via.placeholder.com/400x300/A569BD/FFFFFF?text=Fog+Machine'] },

  // VIDEO RECORDING - TechVision
  { name: 'Sony A7 IV 4K Camera', category: 'video-recording', subcategory: '4K Cameras', description: 'Professional mirrorless 4K camera', basePrice: 5000, minPrice: 4000, maxPrice: 7000, priceUnit: 'day', specs: ['33MP Full Frame', '4K 60fps', '5-axis Stabilization', 'Professional'], tags: ['camera', 'sony', '4k'], popular: true, images: ['https://via.placeholder.com/400x300/BB8FCE/FFFFFF?text=Sony+A7'] },
  { name: 'Canon XA75 Professional Camcorder', category: 'video-recording', subcategory: 'HD Cameras', description: 'Broadcast-quality camcorder', basePrice: 4500, minPrice: 3500, maxPrice: 6000, priceUnit: 'day', specs: ['4K UHD', '15x Zoom', 'Dual XLR', 'Professional'], tags: ['camera', 'canon', 'camcorder'], images: ['https://via.placeholder.com/400x300/BB8FCE/FFFFFF?text=Canon+XA75'] },
  { name: 'Blackmagic ATEM Mini Pro Switcher', category: 'video-recording', subcategory: 'Video Switchers', description: 'Live streaming switcher with 4 HDMI inputs', basePrice: 3000, minPrice: 2200, maxPrice: 4500, priceUnit: 'day', specs: ['4 HDMI Inputs', 'Live Streaming', 'Recording', 'Multiview'], tags: ['switcher', 'blackmagic', 'streaming'], popular: true, images: ['https://via.placeholder.com/400x300/BB8FCE/FFFFFF?text=ATEM+Mini'] },
  { name: 'Live Streaming Package', category: 'video-recording', subcategory: 'Recording Packages', description: 'Complete live streaming setup for events', basePrice: 10000, minPrice: 8000, maxPrice: 15000, priceUnit: 'day', specs: ['4K Camera', 'Switcher', 'Microphone', 'Encoding', 'Setup'], tags: ['package', 'live streaming', 'complete'], images: ['https://via.placeholder.com/400x300/BB8FCE/FFFFFF?text=Streaming+Package'] },

  // CABLES & ACCESSORIES - TechVision
  { name: 'HDMI Cable (3 meters)', category: 'cables-accessories', subcategory: 'HDMI Cables', description: 'High-speed HDMI cable for video connections', basePrice: 200, minPrice: 100, maxPrice: 400, priceUnit: 'day', specs: ['3 Meters', '4K Supported', 'Gold Plated', 'High Speed'], tags: ['cable', 'hdmi', '3m'], images: ['https://via.placeholder.com/400x300/BB8FCE/FFFFFF?text=HDMI+3m'] },
  { name: 'HDMI Cable (10 meters)', category: 'cables-accessories', subcategory: 'HDMI Cables', description: 'Long HDMI cable for extended reach', basePrice: 400, minPrice: 250, maxPrice: 700, priceUnit: 'day', specs: ['10 Meters', '4K Supported', 'Signal Booster', 'Heavy Duty'], tags: ['cable', 'hdmi', '10m'], images: ['https://via.placeholder.com/400x300/BB8FCE/FFFFFF?text=HDMI+10m'] },
  { name: 'XLR Microphone Cable (5 meters)', category: 'cables-accessories', subcategory: 'Audio Cables', description: 'Professional XLR cable for microphones', basePrice: 150, minPrice: 80, maxPrice: 300, priceUnit: 'day', specs: ['5 Meters', 'Balanced', 'Gold Contacts', 'Noise Free'], tags: ['cable', 'xlr', 'audio'], images: ['https://via.placeholder.com/400x300/BB8FCE/FFFFFF?text=XLR+Cable'] },
  { name: 'Projector Tripod Stand', category: 'cables-accessories', subcategory: 'Stands', description: 'Adjustable tripod stand for projectors', basePrice: 500, minPrice: 300, maxPrice: 800, priceUnit: 'day', specs: ['Adjustable Height', 'Universal Mount', 'Stable Base', 'Portable'], tags: ['stand', 'tripod', 'projector'], images: ['https://via.placeholder.com/400x300/BB8FCE/FFFFFF?text=Tripod'] },
  { name: 'Speaker Stand (Pair)', category: 'cables-accessories', subcategory: 'Stands', description: 'Professional speaker stands with carry bag', basePrice: 800, minPrice: 500, maxPrice: 1200, priceUnit: 'day', specs: ['Pair', 'Adjustable', '35mm Pole', 'Carry Bag'], tags: ['stand', 'speaker', 'pair'], images: ['https://via.placeholder.com/400x300/BB8FCE/FFFFFF?text=Speaker+Stand'] },

  // SCREENS - ProAV Solutions
  { name: 'Tripod Projection Screen 6x4 feet', category: 'screens', subcategory: 'Tripod Screens', description: 'Portable tripod screen for presentations', basePrice: 800, minPrice: 500, maxPrice: 1200, priceUnit: 'day', specs: ['6x4 feet', 'Matte White', 'Tripod Stand', 'Easy Setup'], tags: ['screen', 'tripod', '6x4'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=Screen+6x4'] },
  { name: 'Fast Fold Screen 10x8 feet', category: 'screens', subcategory: 'Fast Fold Screens', description: 'Professional fast-fold screen for events', basePrice: 2500, minPrice: 1800, maxPrice: 3500, priceUnit: 'day', specs: ['10x8 feet', 'Front/Rear', 'Aluminum Frame', 'Quick Setup'], tags: ['screen', 'fast fold', '10x8'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=Screen+10x8'] },
  { name: 'Motorized Screen 120 inch', category: 'screens', subcategory: 'Motorized Screens', description: 'Electric motorized screen with remote', basePrice: 3000, minPrice: 2200, maxPrice: 4500, priceUnit: 'day', specs: ['120 inch', '16:9 Aspect', 'Remote Control', 'Wall/Ceiling Mount'], tags: ['screen', 'motorized', '120 inch'], images: ['https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=Motorized'] },
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Equipment.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const createdUsers = await User.insertMany(suppliers);
    console.log(`👤 Created ${createdUsers.length} users`);

    // Map suppliers
    const proAV = createdUsers.find(u => u.businessName === 'ProAV Solutions');
    const soundMaster = createdUsers.find(u => u.businessName === 'SoundMaster Events');
    const djPro = createdUsers.find(u => u.businessName === 'DJ Pro Rentals');
    const techVision = createdUsers.find(u => u.businessName === 'TechVision');

    // Assign equipment to suppliers
    const equipmentWithSuppliers = equipmentData.map(item => {
      let supplierId;
      if (['projectors', 'led-walls', 'screens'].includes(item.category)) {
        supplierId = proAV._id;
      } else if (['sound-systems', 'microphones'].includes(item.category)) {
        supplierId = soundMaster._id;
      } else if (['dj-equipment', 'lighting'].includes(item.category)) {
        supplierId = djPro._id;
      } else {
        supplierId = techVision._id;
      }
      return { ...item, supplierId };
    });

    // Create equipment
    const createdEquipment = await Equipment.insertMany(equipmentWithSuppliers);
    console.log(`📦 Created ${createdEquipment.length} equipment items`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('👤 Buyer: buyer@test.com / password123');
    console.log('🏢 ProAV Solutions: proav@urbanav.com / password123');
    console.log('🎵 SoundMaster: soundmaster@urbanav.com / password123');
    console.log('🎧 DJ Pro: djpro@urbanav.com / password123');
    console.log('🎥 TechVision: techvision@urbanav.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
