import { ReactNode } from 'react';

export const metadata = {
  title: 'Next Action - ActionBias',
  description: 'Your next action to focus on',
};

interface NextLayoutProps {
  children?: ReactNode;
}

export default function NextLayout({ children }: NextLayoutProps) {
  return (
    <div className="antialiased">
      {children}
    </div>
  );
}