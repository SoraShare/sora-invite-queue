import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Users, Share2, Sparkles, Github, Linkedin, Heart, Shield, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AppFooter } from './AppFooter';
import { useAuth } from '@/hooks/useAuth';

export const Homepage = () => {
  const [isAnimated, setIsAnimated] = useState(false);
  const { user, isLoading } = useAuth();

  // Trigger animation after component mounts - MUST be before any conditional returns
  useEffect(() => {
    setTimeout(() => setIsAnimated(true), 100);
  }, []);

  // Redirect authenticated users to /request
  if (!isLoading && user) {
    return <Navigate to="/request" replace />;
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-50">
      {/* Top Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              SoraShare
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/account"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:from-blue-700 hover:to-violet-700 transition-all duration-300"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-indigo-600/10 animate-pulse"></div>
        
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
          <div className="absolute top-32 right-20 w-1 h-1 bg-violet-400 rounded-full animate-bounce delay-300"></div>
          <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-500"></div>
          <div className="absolute top-40 right-1/3 w-1 h-1 bg-blue-300 rounded-full animate-bounce delay-700"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`transition-all duration-1000 ease-out ${isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-blue-200 mb-8 shadow-sm">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-gray-700">Community-Driven AI Access</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Share the Power of Sora,
              </span>
              <br />
              <span className="text-gray-800">Responsibly.</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-xl sm:text-2xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed">
              SoraShare connects people who want to explore Sora with the community members who can share access codes.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                to="/request"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-violet-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Get Invitation Code
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/donate"
                className="group inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm text-gray-800 px-8 py-4 rounded-xl font-semibold text-lg border border-gray-200 hover:bg-white hover:border-gray-300 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Heart className="w-5 h-5 text-red-500" />
                Donate Your Code
              </Link>
            </div>

            {/* Social Links */}
            <div className="flex justify-center gap-6">
              <a 
                href="https://github.com/SoraShare/sora-invite-queue" 
                className="text-gray-500 hover:text-gray-700 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-6 h-6" />
              </a>
              <a 
                href="https://linkedin.com/company/sorashare" 
                className="text-gray-500 hover:text-blue-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About the Project */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">
              What Is SoraShare?
            </h2>
            <div className="max-w-4xl mx-auto space-y-6 text-lg text-gray-600 leading-relaxed">
              <p>
                SoraShare is a community-driven initiative designed to make Sora access fair and ethical. 
                We believe that groundbreaking AI technology should be accessible to creators, researchers, 
                and innovators who can use it responsibly.
              </p>
              <p>
                Our platform enables community members to share unused invitation codes, creating a 
                transparent and equitable distribution system that prioritizes genuine interest and 
                responsible use over privilege or chance.
              </p>
            </div>
          </div>

          {/* Visual Flow Diagram */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <span className="font-semibold text-gray-800">Sora</span>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400 rotate-90 sm:rotate-0" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <span className="font-semibold text-gray-800">Invitation Code</span>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400 rotate-90 sm:rotate-0" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <span className="font-semibold text-gray-800">Shared</span>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400 rotate-90 sm:rotate-0" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <span className="font-semibold text-gray-800">New User</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to join our responsible AI sharing community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Request a Code</h3>
              <p className="text-gray-600">Register with LinkedIn or email to request access through our verified community.</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Receive & Try Sora</h3>
              <p className="text-gray-600">Once approved, receive a Sora invite and start exploring the possibilities.</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Share Back</h3>
              <p className="text-gray-600">Donate your extra invitation codes to keep the community loop going strong.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ethics & Community Values */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-violet-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">
              Why Responsible Sharing Matters
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
              Building a transparent, supportive AI community for everyone
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <Shield className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Fair Access</h3>
              <p className="text-gray-600">Encourage equitable access to Sora's technology for creators worldwide.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Users className="w-12 h-12 text-violet-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Prevent Misuse</h3>
              <p className="text-gray-600">Reduce spam and misuse through verified accounts and community oversight.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Heart className="w-12 h-12 text-indigo-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Build Community</h3>
              <p className="text-gray-600">Foster a transparent, supportive environment for AI enthusiasts.</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <a 
              href="https://github.com/SoraShare/sora-invite-queue/wiki/ethics"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read more about our ethical guidelines
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Join the Community CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Join the Community
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Connect. Share. Explore Sora together.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              to="/request"
              className="group inline-flex items-center gap-2 bg-white text-gray-800 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Get Code
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/donate"
              className="group inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Heart className="w-5 h-5 text-red-300" />
              Donate Code
            </Link>
          </div>

          <div className="flex justify-center items-center gap-6">
            <span className="text-blue-100">Follow our journey on</span>
            <a 
              href="https://github.com/SoraShare/sora-invite-queue" 
              className="text-white hover:text-blue-200 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-6 h-6" />
            </a>
            <a 
              href="https://linkedin.com/company/sorashare" 
              className="text-white hover:text-blue-200 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="w-6 h-6" />
            </a>
          </div>
        </div>
      </section>

      <AppFooter variant="rich" />
    </div>
  );
};