import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Building2, User, Mail, Phone, MapPin, FileText, Check, Eye, EyeOff, Trash2, ArrowLeft, LogIn, Sparkles, CheckCircle, Upload, Image as ImageIcon, Lock } from 'lucide-react';
import ritzyardLogo from "@/assets/RITZYARD3.svg";
import { Button } from '@/pages/components/ui/button';
import { Input } from '@/pages/components/ui/input';
import { Label } from '@/pages/components/ui/label';
import { Textarea } from '@/pages/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/pages/components/ui/select';

// Get API URL - use production URL from env or Render backend
const getApiUrl = () => {
  // Always use the environment variable if available and not localhost
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'http://localhost:5000/api') {
    return import.meta.env.VITE_API_URL;
  }
  // For production deployment (Vercel, custom domain, etc.)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://backendmatrix.onrender.com/api';
  }
  // Fallback to localhost for local development
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

// Pre-warm server function
const warmUpServer = async () => {
  try {
    await fetch(`${API_URL}/health`, { method: 'GET' }).catch(() => {});
  } catch {
    // Silently ignore - just warming up
  }
};

const SupplierOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Pre-warm server when reaching step 2 or 3 (before submission)
  useEffect(() => {
    if (step >= 2) {
      warmUpServer();
    }
  }, [step]);

  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    contactPerson: '',
    businessType: 'business',
    password: '',
    confirmPassword: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    businessDescription: '',
    productsOffered: '',
    yearsInBusiness: '',
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    logo: null,
    pan: null,
    aadhaar: null,
    bankProof: null,
    gst: null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [name]: value },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [fieldName]: e.target.files![0] }));
    }
  };

  const handleSubmit = async () => {
    console.log('🎯 Starting submission validation...');
    setLoading(true);
    
    // Validation before submission
    if (!formData.companyName || !formData.email || !formData.phone || !formData.contactPerson) {
      console.error('❌ Step 1 validation failed:', {
        companyName: !!formData.companyName,
        email: !!formData.email,
        phone: !!formData.phone,
        contactPerson: !!formData.contactPerson
      });
      
      const missingFields = [];
      if (!formData.companyName) missingFields.push('Company Name');
      if (!formData.email) missingFields.push('Email');
      if (!formData.phone) missingFields.push('Phone');
      if (!formData.contactPerson) missingFields.push('Contact Person');
      
      toast({
        title: '⚠️ Step 1 Incomplete',
        description: `Please go back to Step 1 and fill: ${missingFields.join(', ')}`,
        variant: 'destructive',
        duration: 6000,
      });
      setLoading(false);
      setStep(1);
      return;
    }

    // Validate password
    if (!formData.password || !formData.confirmPassword) {
      console.error('❌ Password validation failed:', {
        password: !!formData.password,
        confirmPassword: !!formData.confirmPassword
      });
      
      const issue = !formData.password && !formData.confirmPassword 
        ? 'both Password and Confirm Password'
        : !formData.password 
        ? 'Password'
        : 'Confirm Password';
      
      toast({
        title: '⚠️ Password Required',
        description: `Please go back to Step 1 and enter ${issue}`,
        variant: 'destructive',
        duration: 6000,
      });
      setLoading(false);
      setStep(1);
      return;
    }

    if (formData.password.length < 6) {
      console.error('❌ Password too short:', formData.password.length);
      toast({
        title: '⚠️ Password Too Short',
        description: `Password must be at least 6 characters (current: ${formData.password.length})`,
        variant: 'destructive',
        duration: 6000,
      });
      setLoading(false);
      setStep(1);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      console.error('❌ Passwords do not match');
      toast({
        title: '⚠️ Passwords Don\'t Match',
        description: 'Please go back to Step 1 and ensure both password fields match',
        variant: 'destructive',
        duration: 6000,
      });
      setLoading(false);
      setStep(1);
      return;
    }

    if (!formData.businessDescription || !formData.productsOffered || !formData.yearsInBusiness) {
      console.error('❌ Step 2 validation failed:', {
        businessDescription: !!formData.businessDescription,
        productsOffered: !!formData.productsOffered,
        yearsInBusiness: !!formData.yearsInBusiness
      });
      
      // Build specific error message
      const missingFields = [];
      if (!formData.businessDescription) missingFields.push('Business Description');
      if (!formData.productsOffered) missingFields.push('Products/Services Offered');
      if (!formData.yearsInBusiness) missingFields.push('Years in Business');
      
      toast({
        title: '⚠️ Step 2 Incomplete',
        description: `Please go back to Step 2 and fill: ${missingFields.join(', ')}`,
        variant: 'destructive',
        duration: 6000,
      });
      setLoading(false);
      setStep(2);
      return;
    }

    if (!files.pan) {
      console.error('❌ Step 3 validation failed: PAN Card missing');
      toast({
        title: '⚠️ Document Required',
        description: 'Please upload your PAN Card (Required)',
        variant: 'destructive',
        duration: 6000,
      });
      setLoading(false);
      return;
    }

    if (!files.bankProof) {
      console.error('❌ Step 3 validation failed: Bank Proof missing');
      toast({
        title: '⚠️ Document Required',
        description: 'Please upload your Bank Proof (Required)',
        variant: 'destructive',
        duration: 6000,
      });
      setLoading(false);
      return;
    }

    console.log('✅ All validations passed! Proceeding with submission...');

    try {
      const submitData = new FormData();

      // Append form fields
      submitData.append('companyName', formData.companyName);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('contactPerson', formData.contactPerson);
      submitData.append('businessType', formData.businessType);
      submitData.append('password', formData.password);
      submitData.append('address', JSON.stringify(formData.address));
      submitData.append('businessDescription', formData.businessDescription);
      // Parse products offered as array, then stringify it (backend will parse once)
      const productsArray = formData.productsOffered.split(',').map(p => p.trim()).filter(p => p.length > 0);
      submitData.append('productsOffered', JSON.stringify(productsArray));
      submitData.append('yearsInBusiness', formData.yearsInBusiness);

      // Append files
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          submitData.append(key, file);
        }
      });

      console.log('🚀 Submitting application to:', `${API_URL}/supplier/submit`);
      console.log('📋 API_URL from env:', import.meta.env.VITE_API_URL);
      console.log('📦 Form Data:', {
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        contactPerson: formData.contactPerson,
        businessType: formData.businessType,
        password: formData.password ? '***' : 'MISSING',
        confirmPassword: formData.confirmPassword ? '***' : 'MISSING',
        address: formData.address,
        businessDescription: formData.businessDescription,
        productsOffered: formData.productsOffered,
        yearsInBusiness: formData.yearsInBusiness,
        files: Object.keys(files).filter(key => files[key] !== null)
      });

      // Show warming up toast for slow servers
      toast({
        title: '🚀 Submitting Application...',
        description: 'Server may take 30-60 seconds to respond. Please wait...',
        duration: 5000,
      });

      // Add timeout with AbortController (90 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(`${API_URL}/supplier/submit`, {
        method: 'POST',
        body: submitData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('✅ Response status:', response.status);
      console.log('✅ Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ Server error response:', errorData);
        
        // If backend provides missing fields, show them
        if (errorData?.missingFields && Array.isArray(errorData.missingFields)) {
          const fieldsList = errorData.missingFields.map((f: string) => `• ${f}`).join('\n');
          throw new Error(`Missing Required Fields:\n\n${fieldsList}`);
        }
        
        throw new Error(errorData?.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Success response data:', data);

      if (data.success) {
        console.log('🎉 SUCCESS! Showing toast and redirecting...');
        console.log('📧 Redirecting to status page with email:', formData.email);
        
        toast({
          title: '🎉 Application Submitted!',
          description: 'Your application is pending admin review. Redirecting to status page...',
          duration: 3000,
        });
        
        // Redirect to status page with email parameter
        const redirectUrl = `/status?email=${encodeURIComponent(formData.email)}`;
        console.log('🔗 Redirect URL:', redirectUrl);
        
        // Use a shorter delay and ensure redirect happens
        setTimeout(() => {
          console.log('🚀 Executing redirect now...');
          navigate(redirectUrl);
        }, 1000);
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (error: any) {
      console.error('❌ Submission error:', error);
      
      // Handle timeout/abort errors
      let errorMessage = error.message || 'Failed to submit application. Please check your connection and try again.';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. The server may be starting up. Please try again in 1-2 minutes.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 8000,
      });
      setLoading(false); // Only set loading to false on error
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const steps = [
    { number: 1, title: 'Company Info', icon: Building2 },
    { number: 2, title: 'Business Details', icon: FileText },
    { number: 3, title: 'Documents', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-[#f3f0ec] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background - Match Login Page */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10"></div>
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-primary/30 to-primary-glow/20 rounded-full blur-3xl opacity-60 animate-float"></div>
        <div className="absolute top-40 right-20 w-[500px] h-[500px] bg-gradient-to-br from-secondary/25 to-primary/15 rounded-full blur-3xl opacity-50 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-br from-primary-glow/30 to-secondary/20 rounded-full blur-3xl opacity-40 animate-float" style={{animationDelay: '4s'}}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Branding & Steps */}
          <div className="hidden lg:block space-y-6 sticky top-8">
            {/* Logo & Brand */}
            <div className="glass-card border-2 border-white/30 p-8 rounded-3xl backdrop-blur-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl overflow-hidden">
                  <img src={ritzyardLogo} alt="ritzyard logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold leading-tight notranslate">
                    <span className="text-primary">r</span>
                    <span className="text-[#452a21]">itz </span>
                    <span className="text-[#452a21]">yard</span>
                  </span>
                  <span className="text-sm font-medium text-[#452a21] notranslate">
                    Where Value Meets Velocity
                  </span>
                </div>
              </div>
              <p className="text-lg text-foreground leading-relaxed">
                Join our supplier network in 3 easy steps and start growing your business with us!
              </p>
            </div>

            {/* Steps Progress */}
            <div className="glass-card border-2 border-white/30 p-8 rounded-3xl backdrop-blur-2xl">
              <h3 className="text-xl font-bold text-foreground mb-6">Application Steps</h3>
              <div className="space-y-4">
                {steps.map((stepItem, index) => (
                  <div key={stepItem.number} className="relative">
                    <div className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                      step === stepItem.number 
                        ? 'bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary/50' 
                        : step > stepItem.number
                        ? 'bg-green-50/50 border-2 border-green-200/50'
                        : 'bg-background/30 border-2 border-border/30'
                    }`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        step === stepItem.number
                          ? 'bg-gradient-to-br from-primary to-secondary shadow-lg'
                          : step > stepItem.number
                          ? 'bg-green-500'
                          : 'bg-muted'
                      }`}>
                        {step > stepItem.number ? (
                          <Check className="w-6 h-6 text-white" />
                        ) : (
                          <stepItem.icon className={`w-6 h-6 ${step === stepItem.number ? 'text-white' : 'text-muted-foreground'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${step >= stepItem.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                          Step {stepItem.number}
                        </p>
                        <p className={`text-base font-bold ${step === stepItem.number ? 'text-primary' : 'text-foreground'}`}>
                          {stepItem.title}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`absolute left-10 top-full w-0.5 h-4 ${
                        step > stepItem.number ? 'bg-green-500' : 'bg-border'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Already a Supplier CTA */}
            <div className="glass-card border-2 border-primary/30 p-8 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-primary/5 to-secondary/5 hover:shadow-2xl transition-all duration-300 group cursor-pointer" onClick={() => navigate('/login')}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <LogIn className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    Already a Supplier?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Access your dashboard to manage products and orders
                  </p>
                  <Button className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl group-hover:scale-105 transition-all">
                    Login to Dashboard →
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="glass-card border-2 border-white/30 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-2xl">
            <div className="bg-gradient-to-r from-primary/10 via-primary-glow/10 to-secondary/10 border-b border-white/20 p-8">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-secondary flex items-center justify-center shadow-xl animate-glow-pulse">
                  <Store className="w-10 h-10 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center text-foreground mb-2">
                Supplier Onboarding
              </h2>
              <p className="text-center text-muted-foreground text-sm">
                Step {step} of 3 - {steps[step - 1].title}
              </p>
            </div>

            <div className="p-8 max-h-[600px] overflow-y-auto scrollbar-hide">
              {/* Step 1: Company Information */}
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-foreground font-semibold">Company Name *</Label>
                    <div className="relative group">
                      <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-br from-primary to-secondary rounded-l-lg flex items-center justify-center group-hover:shadow-lg transition-all z-10">
                        <Building2 className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                      <Input
                        id="companyName"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        placeholder="Enter your company name"
                        className="pl-16 h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground font-semibold">Email *</Label>
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-br from-primary to-secondary rounded-l-lg flex items-center justify-center group-hover:shadow-lg transition-all z-10">
                          <Mail className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="company@example.com"
                          className="pl-16 h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-foreground font-semibold">Phone *</Label>
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-br from-primary to-secondary rounded-l-lg flex items-center justify-center group-hover:shadow-lg transition-all z-10">
                          <Phone className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="+91 XXXXXXXXXX"
                          className="pl-16 h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson" className="text-foreground font-semibold">Contact Person *</Label>
                    <div className="relative group">
                      <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-br from-primary to-secondary rounded-l-lg flex items-center justify-center group-hover:shadow-lg transition-all z-10">
                        <User className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                      <Input
                        id="contactPerson"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        placeholder="Full name of contact person"
                        className="pl-16 h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType" className="text-foreground font-semibold">Business Type *</Label>
                    <Select
                      value={formData.businessType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}
                    >
                      <SelectTrigger className="h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business/Company</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Password Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-foreground font-semibold">Password *</Label>
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-br from-primary to-secondary rounded-l-lg flex items-center justify-center group-hover:shadow-lg transition-all z-10">
                          <Lock className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter password (min 6 characters)"
                          className="pl-16 pr-12 h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-foreground font-semibold">Confirm Password *</Label>
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-br from-primary to-secondary rounded-l-lg flex items-center justify-center group-hover:shadow-lg transition-all z-10">
                          <Lock className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="Re-enter password"
                          className="pl-16 pr-12 h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Company Logo - Optional */}
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Company Logo (Optional)
                    </Label>
                    <p className="text-xs text-muted-foreground">Upload JPG, PNG, or WebP (Max 5MB) - Stored on Cloudinary</p>
                    {!files.logo ? (
                      <div className="relative border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 transition-colors bg-primary/5 cursor-pointer group">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          onChange={(e) => handleFileChange(e, 'logo')}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:shadow-lg transition-all">
                            <Upload className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-foreground">Click to upload logo</p>
                            <p className="text-xs text-muted-foreground">or drag and drop</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {files.logo && (
                                <img
                                  src={URL.createObjectURL(files.logo)}
                                  alt="Logo preview"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">{files.logo.name}</p>
                              <p className="text-xs text-muted-foreground">{(files.logo.size / 1024 / 1024).toFixed(2)} MB</p>
                              <p className="text-xs text-green-600 font-medium mt-1">✓ Ready to upload to Cloudinary</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFiles(prev => ({ ...prev, logo: null }))}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                            title="Remove logo"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-foreground font-semibold">Address *</Label>
                    <div className="relative group">
                      <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-br from-primary to-secondary rounded-l-lg flex items-center justify-center group-hover:shadow-lg transition-all z-10">
                        <MapPin className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                      <Input
                        name="street"
                        value={formData.address.street}
                        onChange={handleAddressChange}
                        placeholder="Street Address"
                        className="pl-16 h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        name="city"
                        value={formData.address.city}
                        onChange={handleAddressChange}
                        placeholder="City"
                        className="h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                        required
                      />
                      <Input
                        name="state"
                        value={formData.address.state}
                        onChange={handleAddressChange}
                        placeholder="State"
                        className="h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        name="pincode"
                        value={formData.address.pincode}
                        onChange={handleAddressChange}
                        placeholder="Pincode"
                        className="h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                        required
                      />
                      <Input
                        name="country"
                        value={formData.address.country}
                        onChange={handleAddressChange}
                        placeholder="Country"
                        className="h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="glass-card border-2 border-primary/20 rounded-xl p-5 backdrop-blur-xl bg-primary/5">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-primary border-border rounded focus:ring-primary cursor-pointer"
                        required
                      />
                      <label htmlFor="terms" className="text-sm text-foreground cursor-pointer">
                        I agree to the{' '}
                        <a
                          href="/terms-of-service"
                          target="_blank"
                          className="text-primary font-semibold hover:underline"
                        >
                          Terms and Conditions
                        </a>
                        {' '}and{' '}
                        <a
                          href="/privacy-policy"
                          target="_blank"
                          className="text-primary font-semibold hover:underline"
                        >
                          Privacy Policy
                        </a>
                        . I confirm that all information provided is accurate and complete.
                      </label>
                    </div>
                    {!termsAccepted && (
                      <p className="text-xs text-muted-foreground mt-2 ml-8">
                        * You must accept the terms and conditions to proceed
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Business Details */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="businessDescription" className="text-foreground font-semibold">Business Description *</Label>
                    <Textarea
                      id="businessDescription"
                      name="businessDescription"
                      value={formData.businessDescription}
                      onChange={handleInputChange}
                      placeholder="Describe your business and what you offer..."
                      rows={5}
                      className="border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productsOffered" className="text-foreground font-semibold">Products/Services Offered *</Label>
                    <Textarea
                      id="productsOffered"
                      name="productsOffered"
                      value={formData.productsOffered}
                      onChange={handleInputChange}
                      placeholder="Enter products separated by commas (e.g., Steel, Cement, Wood)"
                      rows={3}
                      className="border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="yearsInBusiness" className="text-foreground font-semibold">Years in Business *</Label>
                    <Input
                      id="yearsInBusiness"
                      name="yearsInBusiness"
                      type="number"
                      min="0"
                      value={formData.yearsInBusiness}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="h-12 border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm rounded-lg"
                      required
                    />
                  </div>

                  <div className="glass-card border-2 border-blue-200/50 rounded-xl p-5 backdrop-blur-xl bg-blue-50/30">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-1">Next Step</p>
                        <p className="text-xs text-blue-800 leading-relaxed">
                          After this, you'll need to upload required documents for verification.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Document Upload */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="glass-card border-2 border-blue-200/50 rounded-xl p-4 backdrop-blur-xl bg-blue-50/30">
                    <p className="text-sm text-blue-900 font-medium">
                      📄 Upload required documents (PDF, JPG, PNG, DOC - Max 5MB each)
                    </p>
                  </div>

                  {/* PAN Card - Required */}
                  <div className="glass-card border-2 border-primary/30 rounded-xl p-4 bg-white/50 hover:shadow-lg transition-all backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Label htmlFor="pan" className="font-semibold text-foreground">
                            PAN Card
                          </Label>
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Required</span>
                        </div>
                      {!files.pan ? (
                        <div className="relative">
                          <Input
                            id="pan"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => handleFileChange(e, 'pan')}
                            className="cursor-pointer"
                            required
                          />
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="text-sm text-green-700 font-medium truncate">{files.pan.name}</span>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => window.open(URL.createObjectURL(files.pan!), '_blank')}
                                className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                                title="View document"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setFiles(prev => ({ ...prev, pan: null }))}
                                className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete document"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Aadhaar Card - Optional */}
                  <div className="glass-card border-2 border-white/30 rounded-xl p-4 bg-white/50 hover:shadow-lg transition-all backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Label htmlFor="aadhaar" className="font-semibold text-foreground">
                            Aadhaar Card
                          </Label>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Optional</span>
                        </div>
                        {!files.aadhaar ? (
                          <Input
                            id="aadhaar"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => handleFileChange(e, 'aadhaar')}
                            className="cursor-pointer"
                          />
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-sm text-green-700 font-medium truncate">{files.aadhaar.name}</span>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => window.open(URL.createObjectURL(files.aadhaar!), '_blank')}
                                  className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFiles(prev => ({ ...prev, aadhaar: null }))}
                                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bank Proof - Required */}
                  <div className="glass-card border-2 border-primary/30 rounded-xl p-4 bg-white/50 hover:shadow-lg transition-all backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Label htmlFor="bankProof" className="font-semibold text-foreground">
                            Bank Proof
                          </Label>
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Required</span>
                        </div>
                        {!files.bankProof ? (
                          <Input
                            id="bankProof"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => handleFileChange(e, 'bankProof')}
                            className="cursor-pointer"
                            required
                          />
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-sm text-green-700 font-medium truncate">{files.bankProof.name}</span>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => window.open(URL.createObjectURL(files.bankProof!), '_blank')}
                                  className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFiles(prev => ({ ...prev, bankProof: null }))}
                                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* GST/Business License - Recommended */}
                  <div className="glass-card border-2 border-white/30 rounded-xl p-4 bg-white/50 hover:shadow-lg transition-all backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Label htmlFor="gst" className="font-semibold text-foreground">
                            GST/Business License
                          </Label>
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Recommended</span>
                        </div>
                        {!files.gst ? (
                          <Input
                            id="gst"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => handleFileChange(e, 'gst')}
                            className="cursor-pointer"
                          />
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-sm text-green-700 font-medium truncate">{files.gst.name}</span>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => window.open(URL.createObjectURL(files.gst!), '_blank')}
                                  className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFiles(prev => ({ ...prev, gst: null }))}
                                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* What happens next info */}
                  <div className="glass-card border-2 border-blue-200/50 rounded-xl p-5 backdrop-blur-xl bg-blue-50/30">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-1">What happens next?</p>
                        <p className="text-xs text-blue-800 leading-relaxed">
                          Our team will review your application within 24-48 hours. You'll receive an email once approved.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="p-8 pt-0">
              <div className="flex gap-4 pt-6 border-t border-border/50">
                {step > 1 && (
                  <Button 
                    variant="outline" 
                    onClick={prevStep}
                    className="flex-1 h-12 border-2 border-primary/50 text-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
                {step < 3 ? (
                  <Button 
                    onClick={nextStep} 
                    disabled={step === 1 && !termsAccepted}
                    className="flex-1 h-12 bg-gradient-to-r from-primary via-primary-glow to-secondary hover:shadow-xl hover:scale-[1.02] text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue →
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !files.pan}
                    className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-xl hover:scale-[1.02] text-white font-semibold transition-all duration-300 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Submit Application
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile - Already a Supplier CTA */}
          <div className="lg:hidden glass-card border-2 border-primary/30 p-6 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-primary/5 to-secondary/5" onClick={() => navigate('/login')}>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg mx-auto">
                <LogIn className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Already a Supplier?</h3>
              <p className="text-sm text-muted-foreground">
                Access your dashboard to manage products
              </p>
              <Button className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl">
                Login to Dashboard →
              </Button>
            </div>
          </div>
        </div>

        {/* Back to Homepage Button */}
        <div className="text-center mt-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="group bg-transparent border-2 border-primary/40 text-primary backdrop-blur-xl px-6 py-3 h-auto rounded-xl shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center scale-110">
                <ArrowLeft className="w-4 h-4 text-primary drop-shadow-sm" />
              </div>
              <span className="font-semibold text-sm">Back to Homepage</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierOnboarding;
