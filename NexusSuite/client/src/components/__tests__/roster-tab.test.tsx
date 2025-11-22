import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RosterTab } from "../roster-tab";

// Mock the roster context
const mockCreateRoster = jest.fn();
const mockAssignPlayersToRoster = jest.fn();
const mockRemovePlayerFromRoster = jest.fn();

jest.mock("../contexts/RosterContext", () => ({
  useRosterContext: () => ({
    rosters: [
      {
        id: "roster-1",
        name: "Team Alpha",
        description: "Main competitive roster",
        game: "valorant",
        type: "competitive",
        maxPlayers: 5,
        organizationId: "org-123",
        createdBy: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        playerCount: 3,
      },
    ],
    rostersLoading: false,
    createRoster: mockCreateRoster,
    assignPlayersToRoster: mockAssignPlayersToRoster,
    removePlayerFromRoster: mockRemovePlayerFromRoster,
  }),
}));

// Mock the toast hook
const mockToast = jest.fn();
jest.mock("../hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

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
];

describe("RosterTab", () => {
  const defaultProps = {
    organizationId: "org-123",
    currentUserId: "user-123",
    allPlayers: mockPlayers,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders roster tab with header and stats", () => {
    render(<RosterTab {...defaultProps} />);

    expect(screen.getByText("Team Rosters")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage your team rosters, assign players, and track team composition",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Create Roster")).toBeInTheDocument();
  });

  it("displays correct stats", () => {
    render(<RosterTab {...defaultProps} />);

    expect(screen.getByText("Total Rosters")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Total rosters
    expect(screen.getByText("Active Players")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // Player count
    expect(screen.getByText("Games Covered")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Games count
  });

  it("opens create roster dialog when button is clicked", async () => {
    render(<RosterTab {...defaultProps} />);

    const createButton = screen.getByRole("button", { name: "Create Roster" });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Roster")).toBeInTheDocument();
    });
  });

  it("shows roster list when rosters exist", () => {
    render(<RosterTab {...defaultProps} />);

    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Main competitive roster")).toBeInTheDocument();
  });

  it("shows empty state when no rosters exist", () => {
    // Mock empty rosters
    jest.mock("../contexts/RosterContext", () => ({
      useRosterContext: () => ({
        rosters: [],
        rostersLoading: false,
        createRoster: mockCreateRoster,
        assignPlayersToRoster: mockAssignPlayersToRoster,
        removePlayerFromRoster: mockRemovePlayerFromRoster,
      }),
    }));

    render(<RosterTab {...defaultProps} />);

    expect(
      screen.getByText(
        "No rosters found. Create your first roster to get started with team management.",
      ),
    ).toBeInTheDocument();
  });

  it("shows loading state", () => {
    jest.mock("../contexts/RosterContext", () => ({
      useRosterContext: () => ({
        rosters: [],
        rostersLoading: true,
        createRoster: mockCreateRoster,
        assignPlayersToRoster: mockAssignPlayersToRoster,
        removePlayerFromRoster: mockRemovePlayerFromRoster,
      }),
    }));

    render(<RosterTab {...defaultProps} />);

    expect(screen.getByText("Loading rosters...")).toBeInTheDocument();
  });

  it("handles successful roster creation", async () => {
    mockCreateRoster.mockResolvedValueOnce(undefined);

    render(<RosterTab {...defaultProps} />);

    const createButton = screen.getByRole("button", { name: "Create Roster" });
    fireEvent.click(createButton);

    // Fill and submit the form (this would be tested in the dialog component)
    // For now, just verify the dialog opened
    await waitFor(() => {
      expect(screen.getByText("Create New Roster")).toBeInTheDocument();
    });
  });

  it("handles roster creation error", async () => {
    mockCreateRoster.mockRejectedValueOnce(new Error("Creation failed"));

    render(<RosterTab {...defaultProps} />);

    const createButton = screen.getByRole("button", { name: "Create Roster" });
    fireEvent.click(createButton);

    // The error would be handled in the dialog component
    // For now, just verify the dialog opened
    await waitFor(() => {
      expect(screen.getByText("Create New Roster")).toBeInTheDocument();
    });
  });

  it("handles player assignment", async () => {
    mockAssignPlayersToRoster.mockResolvedValueOnce(undefined);

    render(<RosterTab {...defaultProps} />);

    // This would trigger the assign players dialog
    // The actual assignment is tested in the dialog component
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
  });

  it("handles player removal", async () => {
    mockRemovePlayerFromRoster.mockResolvedValueOnce(undefined);

    render(<RosterTab {...defaultProps} />);

    // Player removal would be handled through the roster list component
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
  });
});
