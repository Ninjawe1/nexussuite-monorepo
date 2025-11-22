import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerAssignmentDialog } from "../player-assignment-dialog";

// Mock players data
const mockPlayers = [
  {
    id: "player-1",
    name: "John Doe",
    email: "john@example.com",
    role: "top",
    game: "valorant",
    avatar: "",
    status: "active" as const,
  },
  {
    id: "player-2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "jungle",
    game: "valorant",
    avatar: "",
    status: "active" as const,
  },
  {
    id: "player-3",
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "mid",
    game: "valorant",
    avatar: "",
    status: "inactive" as const,
  },
];

describe("PlayerAssignmentDialog", () => {
  const mockOnSubmit = jest.fn();
  const mockOnOpenChange = jest.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onSubmit: mockOnSubmit,
    rosterId: "roster-123",
    rosterName: "Team Alpha",
    maxPlayers: 5,
    currentPlayers: [],
    allPlayers: mockPlayers,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders dialog when open", () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    expect(
      screen.getByText("Assign Players to Team Alpha"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select players to add to this roster. You can add up to 5 more players.",
      ),
    ).toBeInTheDocument();
  });

  it("shows correct available slots", () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    expect(screen.getByText("5 slots available")).toBeInTheDocument();
  });

  it("shows reduced available slots when roster has players", () => {
    render(
      <PlayerAssignmentDialog
        {...defaultProps}
        currentPlayers={[{ playerId: "player-1", role: "starter" }]}
      />,
    );

    expect(screen.getByText("4 slots available")).toBeInTheDocument();
  });

  it("filters players by search term", async () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search players...");
    await userEvent.type(searchInput, "John");

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("filters players by role", async () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    const roleSelect = screen.getByRole("combobox", { name: "Filter by role" });
    fireEvent.click(roleSelect);

    await waitFor(() => {
      fireEvent.click(screen.getByText("Top"));
    });

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("filters players by status", async () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    const statusSelect = screen.getByRole("combobox", {
      name: "Filter by status",
    });
    fireEvent.click(statusSelect);

    await waitFor(() => {
      fireEvent.click(screen.getByText("Inactive"));
    });

    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("allows selecting players", async () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Select first player

    expect(screen.getByText("Assign 1 Players")).toBeInTheDocument();
  });

  it("prevents selecting more players than available slots", async () => {
    render(
      <PlayerAssignmentDialog
        {...defaultProps}
        currentPlayers={[{ playerId: "player-1", role: "starter" }]}
        maxPlayers={2}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Select first available player
    fireEvent.click(checkboxes[1]); // Try to select second player

    // Should show warning
    await waitFor(() => {
      expect(
        screen.getByText(
          "You've selected 2 players but only 1 slots are available.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("allows selecting role for assignment", async () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    const roleSelect = screen.getByRole("combobox", { name: "Assign Role" });
    fireEvent.click(roleSelect);

    await waitFor(() => {
      fireEvent.click(screen.getByText("Substitute"));
    });

    // Select a player and submit
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    const submitButton = screen.getByRole("button", {
      name: "Assign 1 Players",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        rosterId: "roster-123",
        playerIds: ["player-1"],
        role: "substitute",
      });
    });
  });

  it("shows loading state", () => {
    render(<PlayerAssignmentDialog {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole("button", { name: /assigning/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Assigning...");
  });

  it("closes dialog when cancel is clicked", () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows validation error when no players are selected", async () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: "Assign 0 Players",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Please select at least one player"),
      ).toBeInTheDocument();
    });
  });

  it("does not show players already in roster", () => {
    render(
      <PlayerAssignmentDialog
        {...defaultProps}
        currentPlayers={[{ playerId: "player-1", role: "starter" }]}
      />,
    );

    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
  });

  it("shows empty state when no players match filters", async () => {
    render(<PlayerAssignmentDialog {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search players...");
    await userEvent.type(searchInput, "NonExistentPlayer");

    expect(screen.getByText("No available players found")).toBeInTheDocument();
    expect(
      screen.getByText("Try adjusting your filters or search terms"),
    ).toBeInTheDocument();
  });
});
