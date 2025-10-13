import { Link } from 'react-router-dom';

interface AppFooterProps {
  variant?: 'simple' | 'rich';
}

export const AppFooter = ({ variant = 'simple' }: AppFooterProps) => {
  if (variant === 'rich') {
    return (
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                SoraShare
              </h3>
              <p className="text-gray-400 mt-2">Responsible access for the next generation of AI</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <nav className="flex gap-6">
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                <Link to="/request" className="hover:text-white transition-colors">Get Code</Link>
                <Link to="/donate" className="hover:text-white transition-colors">Donate Code</Link>
                <a href="https://github.com/SoraShare/sora-invite-queue" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href="https://linkedin.com/company/sorashare" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </nav>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 SoraShare. Built for the AI community • Fair • Transparent • Open Source
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Contact: <a href="mailto:hello@sorashare.com" className="hover:text-gray-300 transition-colors">hello@sorashare.com</a>
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-white border-t border-gray-200 flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600">
          <p className="text-sm">
            Built for the AI community • Fair • Transparent • Open Source
          </p>
          <p className="text-xs mt-2">
            Part of the SoraShare community initiative
          </p>
        </div>
      </div>
    </footer>
  );
};