export default function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <h1 className="text-xl font-bold">Company Wiki</h1>
      <div className="space-x-4">
        <a href="/">Home</a>
        <a href="/docs">Docs</a>
        <a href="/login">Login</a>
      </div>
    </nav>
  );
}
