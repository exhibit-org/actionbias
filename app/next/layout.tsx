export const metadata = {
  title: 'Next Action - ActionBias',
  description: 'Your next action to focus on',
};

export default function NextLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="antialiased">
      {children}
    </div>
  );
}