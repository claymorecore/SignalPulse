import { render, screen } from '@testing-library/react';
import Badges from './Badges';

describe('Badges component', () => {
  test('renders all badges with default values', () => {
    render(<Badges />);

    expect(screen.getByText(/status: –/i)).toBeInTheDocument();
    expect(screen.getByText(/session: –/i)).toBeInTheDocument();
    expect(screen.getByText(/universe: 0/i)).toBeInTheDocument();
    expect(screen.getByText(/signals: 0/i)).toBeInTheDocument();
  });

  test('renders badges with provided props', () => {
    render(
      <Badges
        status="online"
        session="abc123"
        universeCount={5}
        signalsCount={10}
      />
    );

    expect(screen.getByText(/status: online/i)).toBeInTheDocument();
    expect(screen.getByText(/session: abc123/i)).toBeInTheDocument();
    expect(screen.getByText(/universe: 5/i)).toBeInTheDocument();
    expect(screen.getByText(/signals: 10/i)).toBeInTheDocument();
  });

  test('renders pills with status as the final rightmost pill', () => {
    render(
      <Badges
        status="online"
        session="abc123"
        universeCount={5}
        signalsCount={10}
      />
    );

    const badgeTexts = screen.getAllByText(/:/i).map((node) => node.textContent);
    expect(badgeTexts.slice(0, 4)).toEqual([
      'session: abc123',
      'universe: 5',
      'signals: 10',
      'status: online'
    ]);
  });
});
