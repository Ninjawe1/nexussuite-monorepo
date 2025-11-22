import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterContext, RosterProvider } from '../contexts/RosterContext';
import { useRosterContext } from '../contexts/RosterContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Firebase
jest.mock('../lib/firebase', () => ({
  db: {},
  auth: {},
  functions: {},
}));

// Mock the roster service
const mockGetRosters = jest.fn();
const mockGetRosterById = jest.fn();
const mockCreateRoster = jest.fn();
const mockUpdateRoster = jest.fn();
const mockDeleteRoster = jest.fn();
const mockGetRosterPlayers = jest.fn();
const mockAssignPlayersToRoster = jest.fn();
const mockRemovePlayerFromRoster = jest.fn();
const mockGetPlayerRosters = jest.fn();

jest.mock('../services/rosterService', () => ({
  RosterService: {
    getRosters: (...args: any[]) => mockGetRosters(...args),
    getRosterById: (...args: any[]) => mockGetRosterById(...args),
    createRoster: (...args: any[]) => mockCreateRoster(...args),
    updateRoster: (...args: any[]) => mockUpdateRoster(...args),
    deleteRoster: (...args: any[]) => mockDeleteRoster(...args),
    getRosterPlayers: (...args: any[]) => mockGetRosterPlayers(...args),
    assignPlayersToRoster: (...args: any[]) => mockAssignPlayersToRoster(...args),
    removePlayerFromRoster: (...args: any[]) => mockRemovePlayerFromRoster(...args),
    getPlayerRosters: (...args: any[]) => mockGetPlayerRosters(...args),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <RosterProvider organizationId="org-123" currentUserId="user-123">
      {children}
    </RosterProvider>
  </QueryClientProvider>
);

// Test component that uses the context
function TestComponent() {
  const {
    rosters,
    rostersLoading,
    createRoster,
    updateRoster,
    deleteRoster,
    assignPlayersToRoster,
    removePlayerFromRoster,
  } = useRosterContext();

  return (
    <div>
      <div data-testid="loading">{rostersLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="rosters-count">{rosters.length}</div>
      <button onClick={() => createRoster({ name: 'Test Roster', game: 'valorant', type: 'competitive', maxPlayers: 5 })}>
        Create Roster
      </button>
      <button onClick={() => updateRoster('roster-1', { name: 'Updated Roster' })}>
        Update Roster
      </button>
      <button onClick={() => deleteRoster('roster-1')}>
        Delete Roster
      </button>
      <button onClick={() => assignPlayersToRoster('roster-1', ['player-1', 'player-2'])}>
        Assign Players
      </button>
      <button onClick={() => removePlayerFromRoster('roster-1', 'player-1')}>
        Remove Player
      </button>
    </div>
  );
}

describe('RosterContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('provides context values to children', () => {
    render(<TestComponent />, { wrapper });

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('rosters-count')).toHaveTextContent('0');
  });

  it('loads rosters successfully', async () => {
    const mockRosters = [
      {
        id: 'roster-1',
        name: 'Team Alpha',
        description: 'Main roster',
        game: 'valorant' as const,
        type: 'competitive' as const,
        maxPlayers: 5,
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        playerCount: 3,
      },
    ];

    mockGetRosters.mockResolvedValueOnce(mockRosters);

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('rosters-count')).toHaveTextContent('1');
    });

    expect(mockGetRosters).toHaveBeenCalledWith('org-123');
  });

  it('handles roster creation', async () => {
    mockCreateRoster.mockResolvedValueOnce({ id: 'roster-new', name: 'Test Roster' });
    mockGetRosters.mockResolvedValueOnce([]);

    render(<TestComponent />, { wrapper });

    const createButton = screen.getByRole('button', { name: 'Create Roster' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateRoster).toHaveBeenCalledWith({
        name: 'Test Roster',
        game: 'valorant',
        type: 'competitive',
        maxPlayers: 5,
        organizationId: 'org-123',
        createdBy: 'user-123',
      });
    });
  });

  it('handles roster update', async () => {
    mockUpdateRoster.mockResolvedValueOnce(undefined);
    mockGetRosters.mockResolvedValueOnce([]);

    render(<TestComponent />, { wrapper });

    const updateButton = screen.getByRole('button', { name: 'Update Roster' });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockUpdateRoster).toHaveBeenCalledWith('roster-1', { name: 'Updated Roster' });
    });
  });

  it('handles roster deletion', async () => {
    mockDeleteRoster.mockResolvedValueOnce(undefined);
    mockGetRosters.mockResolvedValueOnce([]);

    render(<TestComponent />, { wrapper });

    const deleteButton = screen.getByRole('button', { name: 'Delete Roster' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteRoster).toHaveBeenCalledWith('roster-1');
    });
  });

  it('handles player assignment', async () => {
    mockAssignPlayersToRoster.mockResolvedValueOnce(undefined);
    mockGetRosters.mockResolvedValueOnce([]);

    render(<TestComponent />, { wrapper });

    const assignButton = screen.getByRole('button', { name: 'Assign Players' });
    fireEvent.click(assignButton);

    await waitFor(() => {
      expect(mockAssignPlayersToRoster).toHaveBeenCalledWith('roster-1', ['player-1', 'player-2']);
    });
  });

  it('handles player removal', async () => {
    mockRemovePlayerFromRoster.mockResolvedValueOnce(undefined);
    mockGetRosters.mockResolvedValueOnce([]);

    render(<TestComponent />, { wrapper });

    const removeButton = screen.getByRole('button', { name: 'Remove Player' });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockRemovePlayerFromRoster).toHaveBeenCalledWith('roster-1', 'player-1');
    });
  });

  it('handles errors gracefully', async () => {
    mockGetRosters.mockRejectedValueOnce(new Error('Failed to load rosters'));

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    // Should still render even with error
    expect(screen.getByTestId('rosters-count')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockGetRosters.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<TestComponent />, { wrapper });

    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
  });
});

