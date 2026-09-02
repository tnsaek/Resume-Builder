export default function FormMessage({ message }) {
  if (!message?.text) return null;

  return (
    <p className={`form-message ${message.type === 'error' ? 'form-message-error' : 'form-message-success'}`} role="status">
      {message.text}
    </p>
  );
}
