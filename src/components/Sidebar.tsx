export default function Sidebar() {
  return (
    <aside className="w-64 p-4 border-r">
      <h2 className="font-bold mb-4">Docs</h2>
      <ul className="space-y-2">
        <li><a href="/docs/1">Getting Started</a></li>
        <li><a href="/docs/2">Company Policies</a></li>
        <li><a href="/docs/3">Tech Guide</a></li>
      </ul>
    </aside>
  );
}
