import { Link } from "react-router-dom";
import { Package, Building2, ArrowRight } from "lucide-react";

export const ExploreFooter = () => {
  return (
    <footer className="mt-12 py-6 border-t border-border/40 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">PharmaTrack</span>
          </Link>

          {/* Pharmacy CTA */}
          <Link 
            to="/auth" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
          >
            <Building2 className="h-4 w-4" />
            <span>Own a pharmacy? <span className="font-medium text-primary">List it free</span></span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PharmaTrack AI
          </p>
        </div>
      </div>
    </footer>
  );
};
