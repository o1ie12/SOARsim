import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

describe("Landing Page", () => {
  it("renders the SOARSim heading in the hero", () => {
    render(<Page />);
    const headings = screen.getAllByText("SOARSim");
    // Should appear at least twice: in nav and as the main h1
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the subtitle", () => {
    render(<Page />);
    expect(
      screen.getByText("Physics-Based Rocket Flight Simulator")
    ).toBeDefined();
  });

  it("renders the Start Simulation link", () => {
    render(<Page />);
    const link = screen.getByText("Start Simulation");
    expect(link).toBeDefined();
    expect(link.closest("a")?.getAttribute("href")).toBe("/simulate");
  });
});
