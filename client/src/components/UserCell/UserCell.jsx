import { Avatar } from 'antd';
import { Link } from 'react-router-dom';
import { initials } from '../../utils/roles.js';
import './UserCell.css';

// Avatar (naam ke pehle akshar) + naam + neeche chhoti line. Lists mein vyakti / company dikhane ke liye.
//   to      ho to poora cell us page ka link hai
//   square  company jaisi cheez ke liye chaukor avatar
//   extra   naam ke saath chhota tag (jaise "Inactive")
export default function UserCell({ name, sub, to, square = false, extra }) {
  const content = (
    <>
      <Avatar shape={square ? 'square' : 'circle'} size={40} className="user-cell__avatar">
        {initials(name)}
      </Avatar>
      <span className="user-cell__text">
        <span className="user-cell__name">
          {name}
          {extra && <span className="user-cell__extra">{extra}</span>}
        </span>
        {sub && <span className="user-cell__sub">{sub}</span>}
      </span>
    </>
  );

  return to ? (
    <Link to={to} className="user-cell user-cell--link">
      {content}
    </Link>
  ) : (
    <span className="user-cell">{content}</span>
  );
}
