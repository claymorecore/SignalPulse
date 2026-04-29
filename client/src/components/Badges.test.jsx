import { render, screen } from "@testing-library/react";
import Badges from "./Badges.jsx";

describe("Badges component", () => {
  it("renders all badges with default values", () => {
    render(<Badges />);

    expect(screen.getByText(/status: –/i)).toBeInTheDocument();
    expect(screen.getByText(/session: –/i)).toBeInTheDocument();
    expect(screen.getByText(/universe: 0/i)).toBeInTheDocument();
    expect(screen.getByText(/signals: 0/i)).toBeInTheDocument();
  });

  it("renders running state as good", () => {
    render(
      <Badges
        status="running"
        session={12}
        universeCount={40}
        signalsCount={3}
      />
    );

    expect(screen.getByText(/status: running/i)).toBeInTheDocument();
    expect(screen.getByText(/session: 12/i)).toBeInTheDocument();
    expect(screen.getByText(/signals: 3/i)).toBeInTheDocument();
  });

  it("renders stopped state as bad", () => {
    render(<Badges status="stopped" session={2} universeCount={10} signalsCount={0} />);
    expect(screen.getByText(/status: stopped/i)).toBeInTheDocument();
  });
});