import './FormActions.css';

// Lambe form ke Save / Cancel buttons. Screen ke neeche chipke rehte hain, taaki form kitna bhi lamba ho
// (khaaskar phone par) Save hamesha saamne rahe aur poora scroll na karna pade.
export default function FormActions({ children }) {
  return <div className="form-actions">{children}</div>;
}
