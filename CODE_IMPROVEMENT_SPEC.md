# StoneEye Code Improvement Specification

**Project**: StoneEye - Project Gorgon Character Insights and Data Explorer  
**Branch**: feature/unified-log-system  
**Date**: December 12, 2025  
**Status**: Implementation Ready

---

## Overview

This specification outlines targeted improvements to the StoneEye codebase focusing on error handling, type validation, state management consolidation, and testing infrastructure. These improvements will increase code reliability, maintainability, and prepare the architecture for future component extraction.

---

## Phase 1: Testing Infrastructure & Baseline Coverage

**Priority**: CRITICAL - DO FIRST  
**Effort**: High  
**Status**: Not Started

### Rationale
Testing must come FIRST before any refactoring. We need:
- Safety net to catch regressions during refactoring
- Documentation of current behavior
- Confidence to make changes
- Baseline to measure improvements against

**Without tests, refactoring is just "changing stuff and hoping it still works"**

### Objectives
- Establish test infrastructure (Vitest + React Testing Library)
- Create test utilities and mocks
- Achieve baseline coverage for critical paths
- Document current behavior through tests
- Enable safe refactoring
### Deliverables

#### 1.1 Test Infrastructure Setup

**File**: `test/setup.js`
- Configure Vitest with React Testing Library
- Mock IndexedDB (fake-indexeddb)
- Mock Electron APIs (window.electron)
- Setup global test utilities
- Configure DOM environment

**Dependencies to Install**:
```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D fake-indexeddb jsdom
#### 2.2 Error Handling Serviceck  # for icon rendering
```

**File**: `vitest.config.js` (update existing)
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        'electron/',
        '*.config.js'
      ]
    }
  }
});
```

**File**: `test/helpers/testUtils.jsx`
```javascript
import { render } from '@testing-library/react';
import { createMockDb } from './mockDb';

// Render with all providers
export function renderWithProviders(component, options = {}) {
  // Setup contexts as we add them in Phase 3
  return render(component, options);
}

// Mock factories
export function createMockCharacter(overrides = {}) {}
export function createMockItem(overrides = {}) {}
export function createMockNpc(overrides = {}) {}
export function createMockVendorLog(overrides = {}) {}
```

**File**: `test/helpers/mockDb.js`
```javascript
import Dexie from 'dexie';
import 'fake-indexeddb/auto';

export function createMockDb() {
  // Returns configured mock database
}

export function seedMockData(db, data) {
  // Populate with test data
}
```

**File**: `test/helpers/mockElectron.js`
```javascript
export function mockElectronAPI() {
  window.electron = {
    selectDirectory: vi.fn(),
    getSettings: vi.fn(),
    onLiveLogUpdate: vi.fn(),
    // ... all IPC handlers
  };
}
```

#### 1.2 Critical Path Tests (Priority 1)

**File**: `test/services/logParser.test.js` (expand existing)
- ✅ Already exists with basic tests
- [ ] Add tests for incremental parsing
- [ ] Add tests for vendor session persistence
- [ ] Add tests for interaction tracking
- [ ] Add tests for character detection
- [ ] Add tests for date/time parsing edge cases
- [ ] Add tests for malformed log lines
- [ ] Test resetParserState()
- **Target**: 80% coverage

**File**: `test/db/operations.test.js`
```javascript
describe('Database Operations', () => {
  // Test all CRUD operations
  test('stores and retrieves objects by composite key');
  test('queries by type and category');
  test('handles refs array indexing');
  test('handles duplicate entries');
  test('handles quota exceeded errors');
});
```

**File**: `test/utils/dataImport.test.js`
```javascript
describe('Data Import', () => {
  test('processes item JSON correctly');
  test('processes recipe JSON correctly');
  test('processes NPC JSON correctly');
  test('extracts correct IDs from various formats');
  test('extracts refs correctly');
  test('handles missing fields gracefully');
});
```

#### 1.3 Component Tests (Priority 2)

**File**: `test/components/Icon.test.jsx`
```javascript
describe('Icon', () => {
  test('renders with icon name');
  test('applies className');
  test('handles missing icon gracefully');
});
```

**File**: `test/components/GameIcon.test.jsx`
```javascript
describe('GameIcon', () => {
  test('renders with iconId');
  test('applies size classes');
  test('handles CDN failure');
});
```

**File**: `test/components/Badge.test.jsx`
**File**: `test/components/WikiButton.test.jsx`
**File**: `test/components/StatBox.test.jsx`

**Target**: 60% coverage for components

#### 1.4 Integration Tests (Priority 3)

**File**: `test/integration/vendorTracking.test.js`
```javascript
describe('Vendor Tracking Flow', () => {
  test('parses vendor log and stores transactions');
  test('calculates vendor timers correctly');
  test('handles multiple characters');
  test('deduplicates log entries');
});
```

**File**: `test/integration/navigation.test.js`
```javascript
describe('Navigation', () => {
  test('navigates between views');
  test('maintains history stack');
  test('back button works correctly');
  test('deep linking to specific item');
});
```

**File**: `test/integration/dataImport.test.js`
```javascript
describe('Full Data Import', () => {
  test('imports all game data files');
  test('imports character JSON');
  test('imports storage JSON');
  test('handles CORS fallback to file upload');
});
```

### Implementation Checklist
- [ ] Install testing dependencies
- [ ] Configure Vitest with jsdom and coverage
- [ ] Create test setup file with mocks
- [ ] Create test utilities (renderWithProviders, mock factories)
- [ ] Create mock database helper
- [ ] Create mock Electron API helper
- [ ] **Expand logParser tests to 80% coverage**
- [ ] **Write database operation tests**
- [ ] **Write data import utility tests**
- [ ] Write component tests (Icon, GameIcon, Badge, WikiButton)
- [ ] Write integration test for vendor tracking
- [ ] Write integration test for navigation
- [ ] Write integration test for data import
- [ ] Setup coverage reporting
- [ ] **Achieve 50%+ overall coverage before proceeding**
- [ ] Add test script to package.json: `npm test`
- [ ] Add coverage script: `npm run test:coverage`

---

## Phase 2: Error Handling & Resilience

**Priority**: HIGH  
**Effort**: Medium  
**Status**: Not Started

### Objectives
- Centralize error handling patterns
- Add React Error Boundaries for graceful degradation
- Provide user-friendly error feedback
- Implement retry mechanisms for critical operations

### Deliverables

#### 2.1 Error Boundary Components
#### 1.1 Error Boundary Components
**File**: `src/components/ErrorBoundary.jsx`
- Create reusable ErrorBoundary wrapper component
- Display user-friendly error messages with recovery options
- Log errors for debugging (with proper log levels)
- Provide "Reset" and "Report Issue" actions

**File**: `src/components/ErrorFallback.jsx`
- Generic error fallback UI component
- Show error type, message, and stack trace (dev mode only)
- Offer navigation back to safe state

#### 1.2 Error Handling Service
**File**: `src/services/errorHandler.js`
- Centralized error classification (network, database, parsing, validation)
- Standard error response format: `{ type, message, userMessage, recoverable, context }`
- Error logging with severity levels (error, warn, info)
- User notification integration (toast messages for errors)

#### 2.3 Async Operation Wrappers
**File**: `src/utils/asyncHelpers.js`
- `withErrorHandler(asyncFn, options)` - wraps async functions with try/catch
- `withRetry(asyncFn, { maxRetries, backoff, onRetry })` - retry logic for network/IO
- `withTimeout(asyncFn, timeoutMs)` - prevent hanging operations
- `withAbort(asyncFn)` - AbortController integration for cancellable requests

#### 2.4 Database Error Handling
**File**: `src/services/dbErrorHandler.js`
- Wrap all Dexie operations with error handling
- Handle quota exceeded errors
- Handle version migration failures
- Provide user-friendly messages for DB errors

### Implementation Checklist
- [ ] Create ErrorBoundary component
- [ ] Create ErrorFallback component
- [ ] Create errorHandler service
- [ ] Create asyncHelpers utilities
- [ ] Create dbErrorHandler service
- [ ] Wrap App.jsx with ErrorBoundary
- [ ] Wrap all view components with ErrorBoundary
- [ ] Add error handling to all fetch() calls
- [ ] Add error handling to all db operations
- [ ] Add cleanup/AbortController to useEffect hooks
- [ ] Replace console.error() with errorHandler.log()
- [ ] Add user-facing error messages via toast system
- [ ] Test error scenarios (network failure, DB quota, corrupt data)

---

## Phase 3: Type Validation (PropTypes)

**Priority**: HIGH  
**Effort**: Medium  
**Status**: Not Started

### Objectives
- Add runtime type validation for all component props
- Catch prop type errors during development
- Document component interfaces
- Prevent runtime type errors

### Deliverables

#### 3.1 Install PropTypes
```bash
npm install prop-types
```

#### 3.2 Add PropTypes to All Components
Priority order:
1. **Core Components** (Icon, Badge, GameIcon, WikiButton, LoadingBar, etc.)
2. **Detail Components** (ItemDetail, RecipeDetail, AbilityDetail, etc.)
3. **View Components** (IngestView, MyCharacterView, EventsView, etc.)
4. **Helper Components** (NavButton, MobileNavBtn, StatBox, etc.)

#### 3.3 PropTypes Patterns

**Pattern 1: View Components**
```javascript
import PropTypes from 'prop-types';

MyView.propTypes = {
  onNavigate: PropTypes.func,
  goBack: PropTypes.func,
  initialParams: PropTypes.shape({
    type: PropTypes.string,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    query: PropTypes.string
  }),
  autoStart: PropTypes.bool
};

MyView.defaultProps = {
  onNavigate: null,
  goBack: null,
  initialParams: null,
  autoStart: false
};
```

**Pattern 2: Presentational Components**
```javascript
Icon.propTypes = {
  name: PropTypes.string.isRequired,
  className: PropTypes.string,
  size: PropTypes.string
};

Icon.defaultProps = {
  className: '',
  size: 'w-6 h-6'
};
```

**Pattern 3: Data Components**
```javascript
ItemDetail.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    data: PropTypes.object.isRequired
  }).isRequired,
  onNavigate: PropTypes.func
};
```

### Implementation Checklist
- [ ] Install prop-types package
- [ ] Add PropTypes to all components in `src/components/`
- [ ] Add PropTypes to all components in `src/views/`
- [ ] Add PropTypes to helper view components in App.jsx
- [ ] Add defaultProps where appropriate
- [ ] Enable propTypes validation in development
- [ ] Document prop interfaces in component files
- [ ] Test with invalid props to verify validation

---

## Phase 4: Code Consolidation & Duplication Removal

**Priority**: HIGH  
**Effort**: Medium  
**Status**: Not Started

### Objectives
- Eliminate prop drilling
- Reduce component complexity
- Centralize global state
- Prepare for component extraction (Phase 3 future work)

### Deliverables

#### 4.1 Unified Log Parsing

**Current State**:
 
- `src/utils/unifiedLogParser.js` - main parser
- `convertlogs.js` - legacy parser (root level)
- Inline parsing in MyCharacterView.jsx

**Target State**:
- Single parser: `src/services/logParser.js`
- Remove `convertlogs.js` (or move to `/scripts` as dev tool)
- Remove inline parsing from components

**File**: `src/services/logParser.js`
```javascript
export class LogParser {
  // Stateful parser with configurable persistence
  constructor(options = { persistent: true }) {}
  
  parse(content, filename) {}
  parseIncremental(content, filename) {}
  reset() {}
  
  // Static helpers
  static parseInteraction(line) {}
  static parseVendor(line) {}
  static parseDateTime(line) {}
}
```

#### 4.2 NPC Name Normalization

**Current State**: Scattered across multiple files
- MyCharacterView.jsx (lines 524-545) - name variation mapping
- unifiedLogParser.js - NPC name lookup
- Various components - ad-hoc name handling

**Target State**: Centralized utility

**File**: `src/utils/npcHelpers.js`
```javascript
// NPC name normalization and lookup
export function normalizeNpcName(name) {}
export function createNpcLookupMap(npcData) {}
export function findNpcByName(name, npcMap) {}
export function getNpcDisplayName(npc) {}
```

#### 4.3 Data Processing Utilities

**Current State**: Duplicated JSON processing logic
- IngestView.jsx - processJson()
- Multiple components - similar patterns

**Target State**: Shared utilities

**File**: `src/utils/dataProcessing.js`
```javascript
export function extractId(key, value, typeName) {}
export function extractName(value, typeName) {}
export function extractRefs(value, typeName) {}
export function processJsonFile(filename, jsonData) {}
```

#### 4.4 Currency & Display Formatting

**Current State**: Inline formatting in MyCharacterView

**Target State**: Shared utilities

**File**: `src/utils/formatters.js`
```javascript
export function formatCurrency(key) {}
export function formatNumber(num) {}
export function formatDate(date) {}
export function formatTime(time) {}
export function formatDuration(seconds) {}
```

### Implementation Checklist
- [ ] Create LogParser service
- [ ] Migrate parsing logic to LogParser
- [ ] Update all consumers to use LogParser
- [ ] Remove duplicate parser code
- [ ] Delete or archive convertlogs.js
- [ ] Create npcHelpers utility
- [ ] Consolidate NPC name logic
- [ ] Update all NPC name references
- [ ] Create dataProcessing utilities
- [ ] Update IngestView to use shared utilities
- [ ] Create formatters utilities
- [ ] Replace inline formatting with formatters
- [ ] Add unit tests for all utilities
- [ ] Verify no regressions in functionality

---

## Phase 5: Testing Infrastructure

**Priority**: HIGH  
**Effort**: High  
**Status**: Not Started

### Objectives
- Increase test coverage from ~1% to >60%
- Prevent regressions
- Document expected behavior
- Enable confident refactoring

### Deliverables

#### 5.1 Test Utilities & Setup

**File**: `test/setup.js`
- Configure Vitest with React Testing Library
- Mock IndexedDB (fake-indexeddb)
- Mock Electron APIs
- Setup global test utilities

**File**: `test/helpers/testUtils.jsx`
```javascript
// Test helpers
export function renderWithProviders(component, options) {}
export function createMockDb() {}
export function createMockCharacter() {}
export function createMockItem() {}
```

#### 5.2 Service/Utility Tests

**Priority Order**:
1. `test/services/logParser.test.js` - Expand existing tests
2. `test/utils/npcHelpers.test.js` - NPC name normalization
3. `test/utils/formatters.test.js` - Format functions
4. `test/utils/dataProcessing.test.js` - JSON processing
5. `test/services/errorHandler.test.js` - Error handling
6. `test/utils/asyncHelpers.test.js` - Async wrappers

**Coverage Target**: 80% for utilities/services

#### 5.3 Component Tests

**File**: `test/components/Icon.test.jsx`
- Renders with different names
- Applies className correctly
- Handles missing icon gracefully

**File**: `test/components/ErrorBoundary.test.jsx`
- Catches errors from children
- Displays fallback UI
- Calls error handler

**File**: `test/components/Toast.test.jsx`
- Displays toast messages
- Auto-dismisses after timeout
- Handles multiple toasts (FIFO queue)

**Coverage Target**: 60% for components

#### 5.4 Integration Tests

**File**: `test/integration/dataImport.test.js`
- Test full data import flow
- Test character JSON import
- Test log file parsing
- Test database storage

**File**: `test/integration/navigation.test.js`
- Test navigation between views
- Test history stack
- Test deep linking

**File**: `test/integration/vendorTracking.test.js`
- Test vendor data parsing
- Test transaction recording
- Test timer calculations

#### 5.5 Database Tests

**File**: `test/db/operations.test.js`
- Test CRUD operations
- Test indexing and queries
- Test data migrations
- Test error scenarios

### Implementation Checklist
- [ ] Install testing dependencies (fake-indexeddb, @testing-library/react)
- [ ] Create test setup and utilities
- [ ] Write tests for logParser service (expand existing)
---

## Phase 5: State Management Consolidation

**Priority**: HIGH  
**Effort**: Medium-High  
**Status**: Not Started

### Objectives
- Eliminate prop drilling
- Reduce component complexity
- Centralize global state
- Prepare for component extraction (Phase 6 future work)

### Deliverables

#### 5.1 Context API Implementation

**File**: `src/contexts/NavigationContext.jsx`
```javascript
// Navigation state: history stack, current view, navigation functions
- historyStack
- historyIndex
- navigate(tab, params)
- goBack()
- goForward()
- switchTab(tab)
```

**File**: `src/contexts/ToastContext.jsx`
```javascript
// Toast notification system
- toasts []
- showToast(message, type)
- dismissToast(id)
```

**File**: `src/contexts/CharacterContext.jsx`
```javascript
// Character selection and data
- selectedCharId
- availableChars
- charData
- setSelectedChar(id)
- refreshCharData()
```

**File**: `src/contexts/AppContext.jsx`
```javascript
// Global app state
- totalRecords
- isElectron
- settings
- updateSettings()
```

#### 5.2 Custom Hooks

**File**: `src/hooks/useNavigation.js`
- Export navigation context with clean API
- `const { navigate, goBack, currentView } = useNavigation()`

**File**: `src/hooks/useToast.js`
- Export toast context
- `const { showToast } = useToast()`

**File**: `src/hooks/useCharacter.js`
- Export character context
- `const { charData, selectedCharId, setCharacter } = useCharacter()`

**File**: `src/hooks/useDatabase.js`
- Wrap common database operations
- Handle loading/error states
- `const { data, loading, error } = useDatabase(query)`

**File**: `src/hooks/useBookmarks.js`
- Bookmark CRUD operations
- `const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks()`

### Implementation Checklist
- [ ] Create NavigationContext and provider
- [ ] Create ToastContext and provider
- [ ] Create CharacterContext and provider
- [ ] Create AppContext and provider
- [ ] Create custom hooks for each context
- [ ] Wrap App component with context providers
- [ ] Migrate navigation logic from App.jsx to NavigationContext
- [ ] Migrate toast logic from App.jsx to ToastContext
- [ ] Remove prop drilling of navigation functions
- [ ] Remove prop drilling of toast functions
- [ ] Update all components to use context hooks
- [ ] Test navigation flow
- [ ] Test toast system
- [ ] Test character selection

---

## Future Work: Component Extraction (Phase 6)
---

### Phase 5 (State Management)

- ❌ TypeScript migration (explicitly excluded)
- ❌ Complete rewrite
- ❌ Change to different framework
- ❌ Major UI/UX changes

- All changes must maintain backward compatibility
- Existing features must continue to work during migration
**Status**: Deferred - Prepared by Phases 1-5

### Preparation Requirements (Done in Phases 1-5)
- ✅ Test coverage ensures we don't break things (Phase 1)
- ✅ Error boundaries catch issues (Phase 2)
- ✅ PropTypes validate component interfaces (Phase 3)
- ✅ Consolidated utilities reduce duplication (Phase 4)
- ✅ State management via Context (Phase 5)
**Last Updated**: December 12, 2025  
**Approved By**: Development Team
## Implementation Plan

### Week 1-2: Testing Infrastructure (Phase 1) - **DO THIS FIRST**
- Days 1-3: Setup test infrastructure, mocks, and utilities
- Days 4-7: Expand logParser tests to 80% coverage
- Days 8-10: Database and data import tests
- Days 11-12: Component tests (Icon, GameIcon, Badge, etc.)
- Days 13-14: Integration tests (vendor tracking, navigation, data import)
- **Deliverable**: 50%+ overall coverage, safety net for refactoring

### Week 3-4: Error Handling (Phase 2)
- Days 1-3: Error boundaries and fallback components
- Days 4-7: Error handling service and async wrappers
- Days 8-10: Database error handling
- Days 11-14: Integration, testing, and verification

### Week 5-6: Type Validation (Phase 3)
- Days 1-7: Add PropTypes to all components
- Days 8-14: Add PropTypes to all views, test and fix issues

### Week 7-8: Code Consolidation (Phase 4)
- Days 1-5: Consolidate log parsing
- Days 6-8: Consolidate NPC utilities
- Days 9-12: Consolidate data processing and formatters
- Days 13-14: Testing and validation

### Week 9-10: State Management (Phase 5)
- Days 1-4: Create contexts
- Days 5-8: Create custom hooks
- Days 9-12: Migrate components to use contexts
- Days 13-14: Remove prop drilling, test navigation

**Total Estimated Timeline**: 10 weeks (2.5 months)

**Critical Path**: Phase 1 (Testing) blocks all other work - nothing should be refactored without tests## Success Criteria

### Phase 1 (Testing Infrastructure) - **MUST COMPLETE FIRST**
- [ ] Test infrastructure fully configured
- [ ] Mock utilities for DB, Electron, and React contexts
- [ ] 80%+ coverage for logParser (critical path)
- [ ] 70%+ coverage for database operations
- [ ] 60%+ coverage for data import utilities
- [ ] Integration tests for vendor tracking flow
- [ ] 50%+ overall project coverage
- [ ] All tests passing in CI
- [ ] **Blockers removed for safe refactoring**

### Phase 2 (Error Handling)### Phase 3 (PropTypes)### Phase 4 (Code Consolidation)