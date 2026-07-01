export default function Navbar() {
  return (
    <nav className="border-b border-zinc-800">
      <div className="container h-20 flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          <span className="gold">Transform</span>Her
        </h1>
        <div className="flex gap-10">
          <a href="#">Home</a>
          <a href="#">Books</a>
          <a href="#">Categories</a>
          <a href="#">Blog</a>
          <a href="#">About</a>
        </div>
        <div className="flex gap-4">
          <button className="px-5 py-2 rounded-full border border-zinc-700">Login</button>
          <button className="px-5 py-2 rounded-full bg-yellow-500 text-black font-bold">Join Free</button>
        </div>
      </div>
    </nav>
  );
}
