import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterList } from '../roster-list';
import { Roster } from '../services/rosterService';

// Mock data
const mockRosters: Roster[] = [
  {
    id: 'roster-1',
    name: 'Team Alpha',
    description: 'Main competitive roster',
    game: 'valorant',
    type: 'competitive',
    maxPlayers: 5,
    organizationId: 'org-123',
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    playerCount: 3,
  },
  {
    id: 'roster-2',
    name: 'Team Beta',
    description: 'Development squad',
    game: 'cs2',
    type: 'practice',
    maxPlayers: 7,
    organizationId: 'org-123',
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    playerCount: 2,
  },
];

const mockHandlers = {
  onRosterSelect: jest.fn(),
  onRosterEdit: jest.fn(),
  onRosterDelete: jest.fn(),
  onAssignPlayers: jest.fn(),
  onRemovePlayer: jest.fn(),
};

describe('RosterList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders roster list with correct data', () => {
    render(
      <RosterList
        rosters={mockRosters}
        isLoading={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
    expect(screen.getByText('Main competitive roster')).toBeInTheDocument();
    expect(screen.getByText('Development squad')).toBeInTheDocument();
  });

  it('displays game badges correctly', () => {
    render(
      <RosterList
        rosters={mockRosters}
        isLoading={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Valorant')).toBeInTheDocument();
    expect(screen.getByText('CS2')).toBeInTheDocument();
  });

  it('displays player count correctly', () => {
    render(
      <RosterList
        rosters={mockRosters}
        isLoading={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('2 / 7')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <RosterList
        rosters={[]}
        isLoading={true}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Loading rosters...')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(
      <RosterList
        rosters={[]}
        isLoading={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('No rosters found')).toBeInTheDocument();
    expect(screen.getByText('Create your first roster to get started')).toBeInTheDocument();
  });

  it('calls onRosterSelect when roster is clicked', async () => {
    render(
      <RosterList
        rosters={mockRosters}
        isLoading={false}
        {...mockHandlers}
      />
    );

    const rosterCard = screen.getByText('Team Alpha').closest('div[class*="rounded-lg"]');
    fireEvent.click(rosterCard!);

    expect(mockHandlers.onRosterSelect).toHaveBeenCalledWith(mockRosters[0]);
  });

  it('calls onAssignPlayers when assign button is clicked', async () => {
    render(
      <RosterList
        rosters={mockRosters}
        isLoading={false}
        {...mockHandlers}
      />
    );

    const assignButtons = screen.getAllByText('Assign Players');
    fireEvent.click(assignButtons[0]);

    expect(mockHandlers.onAssignPlayers).toHaveBeenCalledWith(mockRosters[0]);
  });

  it('shows dropdown menu with actions', async () => {
    render(
      <RosterList
        rosters={mockRosters}
        isLoading={false}
        {...mockHandlers}
      />
    );

    const dropdownButtons = screen.getAllByRole('button', { name: /open menu/i });
    fireEvent.click(dropdownButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('calls onRosterEdit when edit is clicked', async () => {
    render(
      <RosterList
        rosters={mockRosters}
        isLoading={false}
        {...mockHandlers}
      />
    );

    const dropdownButtons = screen.getAllByRole('button', { name: /open menu/i });
    fireEvent.click(dropdownButtons[0]);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Edit'));
    });

    expect(mockHandlers.onRosterEdit).toHaveBeenCalledWith(mockRosters[0]);
  });

  it('calls onRosterDelete when delete is clicked', async () => {
    render(
      <RosterList
        rosters={mockRosters}
        isLoading={false}
        {...mockHandlers}
      />
    );

    const dropdownButtons = screen.getAllByRole('button', { name: /open menu/i });
    fireEvent.click(dropdownButtons[0]);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Delete'));
    });

    expect(mockHandlers.onRosterDelete).toHaveBeenCalledWith(mockRosters[0]);
  });

  it('disables actions when loading', () => {
    render(
      <RosterList
        rosters={mockRosters}
        isLoading={true}
        {...mockHandlers}
      />
    );

    const assignButtons = screen.queryAllByText('Assign Players');
    expect(assignButtons.length).toBe(0); // Should not show when loading
  });
});

