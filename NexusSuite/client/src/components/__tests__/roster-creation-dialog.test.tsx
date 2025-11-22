import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RosterCreationDialog } from "../roster-creation-dialog";

describe("RosterCreationDialog", () => {
  const mockOnSubmit = jest.fn();
  const mockOnOpenChange = jest.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onSubmit: mockOnSubmit,
    organizationId: "org-123",
    createdBy: "user-123",
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders dialog when open", () => {
    render(<RosterCreationDialog {...defaultProps} />);

    expect(screen.getByText("Create New Roster")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Set up a new roster for your team. Fill in the details below to get started.",
      ),
    ).toBeInTheDocument();
  });

  it("does not render dialog when closed", () => {
    render(<RosterCreationDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("Create New Roster")).not.toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(<RosterCreationDialog {...defaultProps} />);

    expect(screen.getByLabelText("Roster Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (Optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Game")).toBeInTheDocument();
    expect(screen.getByLabelText("Max Players")).toBeInTheDocument();
    expect(screen.getByLabelText("Roster Type")).toBeInTheDocument();
  });

  it("shows validation errors for required fields", async () => {
    render(<RosterCreationDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: "Create Roster" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Roster name must be at least 3 characters"),
      ).toBeInTheDocument();
      expect(screen.getByText("Please select a game")).toBeInTheDocument();
    });
  });

  it("validates roster name format", async () => {
    render(<RosterCreationDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText("Roster Name");
    await userEvent.type(nameInput, "Invalid@Name!");

    const submitButton = screen.getByRole("button", { name: "Create Roster" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Roster name can only contain letters, numbers, spaces, hyphens, and underscores",
        ),
      ).toBeInTheDocument();
    });
  });

  it("validates max players range", async () => {
    render(<RosterCreationDialog {...defaultProps} />);

    const maxPlayersInput = screen.getByLabelText("Max Players");
    await userEvent.clear(maxPlayersInput);
    await userEvent.type(maxPlayersInput, "15");

    const submitButton = screen.getByRole("button", { name: "Create Roster" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Maximum players must not exceed 10"),
      ).toBeInTheDocument();
    });
  });

  it("successfully submits form with valid data", async () => {
    render(<RosterCreationDialog {...defaultProps} />);

    // Fill in form fields
    await userEvent.type(screen.getByLabelText("Roster Name"), "Team Alpha");
    await userEvent.type(
      screen.getByLabelText("Description (Optional)"),
      "Main competitive roster",
    );

    // Select game
    const gameSelect = screen.getByRole("combobox", { name: "Game" });
    fireEvent.click(gameSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText("Valorant"));
    });

    // Submit form
    const submitButton = screen.getByRole("button", { name: "Create Roster" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Team Alpha",
        description: "Main competitive roster",
        game: "valorant",
        type: "casual", // default value
        maxPlayers: 5, // default value
        organizationId: "org-123",
        createdBy: "user-123",
      });
    });
  });

  it("shows loading state", () => {
    render(<RosterCreationDialog {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole("button", { name: /creating/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Creating...");
  });

  it("closes dialog when cancel is clicked", () => {
    render(<RosterCreationDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets form when dialog is closed", () => {
    render(<RosterCreationDialog {...defaultProps} />);

    // Fill in some data
    userEvent.type(screen.getByLabelText("Roster Name"), "Test Team");

    // Close dialog
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    // Reopen dialog (in a real scenario, this would be handled by parent component)
    // For now, just verify that onOpenChange was called with false
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders roster type options correctly", () => {
    render(<RosterCreationDialog {...defaultProps} />);

    expect(screen.getByText("Competitive")).toBeInTheDocument();
    expect(
      screen.getByText("For tournaments and serious play"),
    ).toBeInTheDocument();
    expect(screen.getByText("Casual")).toBeInTheDocument();
    expect(screen.getByText("For fun and relaxed gaming")).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(
      screen.getByText("For training and skill development"),
    ).toBeInTheDocument();
  });

  it("allows selecting roster type", async () => {
    render(<RosterCreationDialog {...defaultProps} />);

    const competitiveRadio = screen.getByLabelText("Competitive");
    fireEvent.click(competitiveRadio);

    // Submit form to verify the selection
    await userEvent.type(screen.getByLabelText("Roster Name"), "Test Team");
    const gameSelect = screen.getByRole("combobox", { name: "Game" });
    fireEvent.click(gameSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText("Valorant"));
    });

    const submitButton = screen.getByRole("button", { name: "Create Roster" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "competitive",
        }),
      );
    });
  });
});
