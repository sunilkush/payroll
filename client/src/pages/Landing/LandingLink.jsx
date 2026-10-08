import { Link } from 'react-router-dom';
import { scrollToHash } from './landingHooks.js';

// Landing ke saare links / CTA isi se bante hain:
//   "#pricing"          page ke andar us section tak scroll
//   "/login"            app ka route (React Router, page reload nahi)
//   "mailto:" / "http"  seedha browser ka link
// className se ye link ya button jaisa dikhta hai (landing.css ke .landing-btn...).
export default function LandingLink({ href, onNavigate, children, ...props }) {
  if (href.startsWith('#')) {
    return (
      <a
        href={href}
        {...props}
        onClick={(event) => {
          event.preventDefault();
          onNavigate?.();
          scrollToHash(href);
        }}
      >
        {children}
      </a>
    );
  }
  if (!href.startsWith('/')) {
    return (
      <a href={href} {...props} onClick={onNavigate}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} {...props} onClick={onNavigate}>
      {children}
    </Link>
  );
}
