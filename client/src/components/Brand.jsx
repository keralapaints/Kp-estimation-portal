// Replace this with the real Kerala Paints logo: <img src="/logo.svg" alt="Kerala Paints" />
export default function Brand({ light = false }) {
  return (
    <span className={`brand ${light ? 'brand--light' : ''}`}>
      <img src="/kplogo.png
      " alt="Kerala Paints" />
    </span>
  );
}