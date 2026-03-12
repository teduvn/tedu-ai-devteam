# TEDU AI Dev Team Dashboard

A comprehensive dashboard that visualizes the AI agent workflow from Jira ticket intake to production deployment.

## Features

### Core Dashboard Components
- **Ticket Details Display**: Shows Jira ticket information with priority badges, labels, and descriptions
- **Workflow Visualization**: Interactive progress bar showing agent phases (analyzing, planning, coding, etc.)
- **Development Plan**: Real-time display of the agent's implementation plan
- **Code Changes Tracking**: Lists created, modified, and deleted files with operation types
- **Test Results**: Shows pass/fail status with coverage metrics and failed tests
- **Live Log Stream**: Real-time agent activity logs

### File Management
- **File Explorer**: Interactive project file tree with icon indicators
- **Code Diff Viewer**: Side-by-side diff display with syntax highlighting
- **Mock Diff Service**: Generates realistic code diffs for demonstration

### Human-in-the-Loop
- **Review Panel**: Appears after tests pass, allowing approval/rejection of production deployment
- **Mock Agent Simulation**: Simulates the complete agent workflow with realistic timing

### Agent Workflow Simulation
- **Mock Ticket Service**: Provides sample Jira tickets for testing
- **Mock Agent Service**: Simulates all agent phases with realistic state transitions
- **Event Stream API**: Server-Sent Events (SSE) for real-time updates

## Technology Stack

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **State Management**: React hooks with custom useAgentStream
- **Real-time Communication**: Server-Sent Events (SSE)
- **Type Safety**: Strict TypeScript with no `any` types
- **Code Quality**: ESLint, Prettier, interface-over-type preference

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── agent/
│   │   │   ├── mock/          # Mock agent simulation API
│   │   │   ├── resume/        # Human review continuation
│   │   │   └── route.ts       # Main agent SSE endpoint
│   │   └── test/              # Test API endpoints
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page with dashboard
├── components/
│   ├── AgentDashboard.tsx    # Main dashboard component
│   ├── CodeDiffViewer.tsx    # Diff display component
│   ├── FileExplorer.tsx      # File tree component
│   ├── LogStream.tsx         # Live log display
│   ├── StatusBadge.tsx       # Phase status badges
│   ├── TicketDetails.tsx     # Ticket information display
│   └── WorkflowVisualization.tsx # Progress visualization
└── lib/
    ├── agentMockService.ts   # Agent state simulation
    ├── mockDiffService.ts    # Code diff generation
    ├── mockTicketService.ts  # Ticket data management
    ├── sampleData.ts         # Sample data and types
    └── useAgentStream.ts     # Custom hook for agent SSE
```

## Getting Started

### Installation

```bash
npm install
npm run dev
```

### Running the Dashboard

1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. Enter a ticket ID (e.g., "TEDU-1", "TEDU-42")
4. Click "Run Agent" to start the simulation

### Ticket IDs

The dashboard supports these mock ticket IDs:
- **TEDU-1**: Implement AI agent dashboard for SDLC automation
- **TEDU-2**: Fix TypeScript compilation errors in agent library
- **TEDU-3**: Add unit tests for file system operations
- **TEDU-42**: Implement real-time collaboration features

## Agent Workflow Phases

The dashboard visualizes the complete agent workflow:

1. **Analyzing**: Ticket requirements and codebase analysis
2. **Planning**: Creating detailed implementation plan
3. **Coding**: Writing and modifying code files
4. **Reviewing**: Code quality review and standards check
5. **Creating PR**: Creating pull request with changes
6. **Deploying Staging**: Deploying to staging environment
7. **Testing**: Running automated tests
8. **Test Passed**: All tests pass successfully
9. **Awaiting Approval**: Human review required
10. **Deploying Production**: Approved changes deployed to production
11. **Done**: Workflow completed

## Key Features in Detail

### Real-time Visualization
- Progress bar updates as agent moves through phases
- Status badges change color and animation based on current phase
- Live logs show agent activities in real-time

### Code Management
- File explorer shows project structure
- Click files to view their diffs
- Color-coded operations (green=create, yellow=modify, red=delete)

### Test Integration
- Coverage percentages with color coding (green≥80%, yellow≥70%, red<70%)
- Failed tests listed with details
- Staging environment links for manual testing

### Human Review
- Review panel appears after tests pass
- Options to approve deployment or reject for rework
- Links to PR and staging environment for verification

## Development Notes

### TypeScript Strictness
- All components use TypeScript with strict type checking
- No `any` types used anywhere in the codebase
- Interfaces preferred over type aliases for object shapes

### ESM Only
- All imports use ES modules (import/export)
- No CommonJS require() statements

### Error Handling
- Try/catch blocks at API boundaries
- Proper error messages and fallback states
- Connection loss detection and recovery

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Responsive grid layouts for different screen sizes
- Dark theme optimized for developer workflows

## Future Enhancements

Potential improvements for the dashboard:

1. **Real Agent Integration**: Connect to actual AI agent services
2. **Multiple Ticket Support**: Manage multiple concurrent agent workflows
3. **Advanced Filtering**: Filter logs and code changes by type
4. **Performance Metrics**: Track agent execution times and resource usage
5. **Team Collaboration**: Multi-user review and commenting
6. **Integration Hooks**: Webhooks for CI/CD pipeline integration
7. **Advanced Visualization**: D3.js charts for metrics and analytics
8. **Export Features**: Export reports, diffs, and test results

## License

Proprietary - TEDU AI Dev Team