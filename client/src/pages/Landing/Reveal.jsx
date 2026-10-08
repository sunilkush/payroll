import { useInView } from './landingHooks.js';

// Screen mein aate hi halka sa upar aate hue dikhna (ek baar). delay: milliseconds, cards ko ek-ek karke laane ke liye.
// "Kam motion" wali setting par CSS ise band kar deta hai.
export default function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...props }) {
  const [ref, inView] = useInView(0.15);
  return (
    <Tag
      ref={ref}
      className={`reveal${inView ? ' is-visible' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...props}
    >
      {children}
    </Tag>
  );
}
