import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';
import Home from './Home.jsx';
import ReadBlog from './ReadBlog.jsx';
import WriteBlog from './WriteBlog.jsx';
import {
  LIMITS,
  MESSAGES,
  ROLES,
  STORAGE_KEYS,
} from '../utils/constants.js';

const userSession = Object.freeze({
  userId: 'user-1',
  username: 'demo_user',
  displayName: 'Demo User',
  role: ROLES.USER,
});

const otherUserSession = Object.freeze({
  userId: 'user-2',
  username: 'other_user',
  displayName: 'Other User',
  role: ROLES.USER,
});

/**
 * Creates a valid stored post.
 *
 * @param {string} id Post identifier.
 * @param {string} title Post title.
 * @param {object} [overrides] Post field overrides.
 * @returns {object}
 */
function createStoredPost(id, title, overrides = {}) {
  return {
    id,
    title,
    content: `Browser-local content for ${title}.`,
    createdAt: '2026-10-14T10:00:00.000Z',
    authorId: userSession.userId,
    authorName: userSession.displayName,
    ...overrides,
  };
}

/**
 * Persists a valid post collection for a test.
 *
 * @param {Array<object>} posts Posts to persist.
 * @returns {void}
 */
function storePosts(posts) {
  window.localStorage.setItem(
    STORAGE_KEYS.posts,
    JSON.stringify(posts),
  );
}

/**
 * Renders blog routes with the supplied session.
 *
 * @param {string} initialEntry Initial route.
 * @param {object} [session] Current browser session.
 * @returns {import('@testing-library/react').RenderResult}
 */
function renderBlogFlow(
  initialEntry,
  session = userSession,
) {
  const onLogout = vi.fn();

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/blogs"
          element={
            <Home
              session={session}
              onLogout={onLogout}
            />
          }
        />
        <Route
          path="/blog/:id"
          element={
            <ReadBlog
              session={session}
              onLogout={onLogout}
            />
          }
        />
        <Route
          path="/write"
          element={
            <WriteBlog
              session={session}
              onLogout={onLogout}
            />
          }
        />
        <Route
          path="/edit/:id"
          element={
            <WriteBlog
              session={session}
              onLogout={onLogout}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Blog feature flows', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows responsive newest-first blog cards with edit controls only for owned posts', () => {
    storePosts([
      createStoredPost('owned-post', 'Owned story', {
        createdAt: '2026-10-14T10:00:00.000Z',
        content: '<script>alert("demo")</script>',
      }),
      createStoredPost('other-post', 'Other story', {
        createdAt: '2026-10-15T10:00:00.000Z',
        authorId: otherUserSession.userId,
        authorName: otherUserSession.displayName,
      }),
    ]);

    renderBlogFlow('/blogs');

    const headings = screen.getAllByRole('heading', {
      level: 2,
    });

    expect(
      headings.map((heading) => heading.textContent),
    ).toEqual(['Other story', 'Owned story']);
    expect(
      screen.getByRole('link', {
        name: 'Read Owned story',
      }),
    ).toHaveAttribute('href', '/blog/owned-post');
    expect(
      screen.getByRole('link', {
        name: 'Edit Owned story',
      }),
    ).toHaveAttribute('href', '/edit/owned-post');
    expect(
      screen.queryByRole('link', {
        name: 'Edit Other story',
      }),
    ).not.toBeInTheDocument();

    const listingGrid = headings[0].closest('article')
      ?.parentElement;

    expect(listingGrid).toHaveClass(
      'grid-cols-1',
      'md:grid-cols-2',
      'lg:grid-cols-3',
    );
    expect(
      screen.getByText('<script>alert("demo")</script>'),
    ).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('renders full plain-text post content with preserved line breaks', () => {
    const post = createStoredPost(
      'read-post',
      'Readable story',
      {
        content: 'First paragraph.\n\nSecond paragraph.',
      },
    );

    storePosts([post]);
    renderBlogFlow(`/blog/${post.id}`);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: post.title,
      }),
    ).toBeInTheDocument();

    const content = screen.getByText(post.content);

    expect(content).toHaveClass(
      'whitespace-pre-wrap',
      'break-words',
    );
    expect(
      screen.getByRole('link', {
        name: 'Edit post',
      }),
    ).toHaveAttribute('href', `/edit/${post.id}`);
    expect(
      screen.getByRole('button', {
        name: 'Delete post',
      }),
    ).toBeInTheDocument();
  });

  it('shows the reader not-found state for an unknown post', () => {
    renderBlogFlow('/blog/missing-post');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Post not found',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The requested post does not exist or may have been deleted.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'View all posts',
      }),
    ).toHaveAttribute('href', '/blogs');
  });

  it('does not show reader management controls to a non-owner', () => {
    const post = createStoredPost(
      'other-reader-post',
      'Another author story',
      {
        authorId: otherUserSession.userId,
        authorName: otherUserSession.displayName,
      },
    );

    storePosts([post]);
    renderBlogFlow(`/blog/${post.id}`);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: post.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: 'Edit post',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'Delete post',
      }),
    ).not.toBeInTheDocument();
  });

  it('requires deletion confirmation and removes the post only after approval', async () => {
    const user = userEvent.setup();
    const post = createStoredPost(
      'delete-post',
      'Story to delete',
    );
    const confirmSpy = vi
      .spyOn(globalThis, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    storePosts([post]);
    renderBlogFlow(`/blog/${post.id}`);

    const deleteButton = screen.getByRole('button', {
      name: 'Delete post',
    });

    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      ),
    ).toEqual([post]);
    expect(deleteButton).toBeInTheDocument();

    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      ),
    ).toEqual([]);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Blog posts',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'No posts yet',
      }),
    ).toBeInTheDocument();
  });

  it('shows create validation errors and live character counters without saving', async () => {
    const user = userEvent.setup();

    renderBlogFlow('/write');

    expect(
      screen.getByText(`0 / ${LIMITS.title.max} characters`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `0 / ${LIMITS.content.max} characters`,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Publish post',
      }),
    );

    expect(
      screen.getByText(MESSAGES.validationFailed),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Title is required.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Content is required.'),
    ).toBeInTheDocument();
    expect(
      window.localStorage.getItem(STORAGE_KEYS.posts),
    ).toBeNull();
  });

  it('creates a post with the current author and navigates to its reader', async () => {
    const user = userEvent.setup();

    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'created-post-id'),
    });
    renderBlogFlow('/write');

    await user.type(
      screen.getByLabelText(/^Title/),
      'New local story',
    );
    await user.type(
      screen.getByLabelText(/^Content/),
      'Content created in this browser.',
    );

    expect(
      screen.getByText(
        `15 / ${LIMITS.title.max} characters`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `32 / ${LIMITS.content.max} characters`,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Publish post',
      }),
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'New local story',
      }),
    ).toBeInTheDocument();
    expect(
      JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      ),
    ).toEqual([
      {
        id: 'created-post-id',
        title: 'New local story',
        content: 'Content created in this browser.',
        createdAt: expect.any(String),
        authorId: userSession.userId,
        authorName: userSession.displayName,
      },
    ]);
  });

  it('prefills an owned post, validates edits, and saves only editable fields', async () => {
    const user = userEvent.setup();
    const post = createStoredPost(
      'editable-post',
      'Original title',
      {
        content: 'Original content.',
      },
    );

    storePosts([post]);
    renderBlogFlow(`/edit/${post.id}`);

    const titleInput = screen.getByLabelText(/^Title/);
    const contentInput = screen.getByLabelText(/^Content/);

    expect(titleInput).toHaveValue(post.title);
    expect(contentInput).toHaveValue(post.content);

    await user.clear(titleInput);
    await user.clear(contentInput);
    await user.click(
      screen.getByRole('button', {
        name: 'Save changes',
      }),
    );

    expect(
      screen.getByText('Title is required.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Content is required.'),
    ).toBeInTheDocument();
    expect(
      JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      ),
    ).toEqual([post]);

    await user.type(titleInput, 'Updated title');
    await user.type(contentInput, 'Updated content.');
    await user.click(
      screen.getByRole('button', {
        name: 'Save changes',
      }),
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Updated title',
      }),
    ).toBeInTheDocument();
    expect(
      JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      ),
    ).toEqual([
      {
        ...post,
        title: 'Updated title',
        content: 'Updated content.',
      },
    ]);
  });

  it('redirects a non-owner away from the direct edit route', () => {
    const post = createStoredPost(
      'forbidden-edit',
      'Protected story',
      {
        authorId: otherUserSession.userId,
        authorName: otherUserSession.displayName,
      },
    );

    storePosts([post]);
    renderBlogFlow(`/edit/${post.id}`);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Blog posts',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        level: 1,
        name: 'Edit post',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: `Edit ${post.title}`,
      }),
    ).not.toBeInTheDocument();
  });

  it('blocks creation when the browser already contains one hundred posts', () => {
    const posts = Array.from(
      { length: LIMITS.posts },
      (_, index) =>
        createStoredPost(
          `capacity-post-${index + 1}`,
          `Capacity post ${index + 1}`,
        ),
    );

    storePosts(posts);
    renderBlogFlow('/write');

    expect(
      screen.getByText(MESSAGES.postLimitReached),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Publish post',
      }),
    ).toBeDisabled();
    expect(
      JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      ),
    ).toHaveLength(LIMITS.posts);
  });

  it('preserves entered create fields when browser quota prevents saving', async () => {
    const user = userEvent.setup();

    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'unsaved-post-id'),
    });
    renderBlogFlow('/write');

    const titleInput = screen.getByLabelText(/^Title/);
    const contentInput = screen.getByLabelText(/^Content/);
    const title = 'Unsaved local story';
    const content =
      'This content must remain available after failure.';

    await user.type(titleInput, title);
    await user.type(contentInput, content);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      () => {
        throw new DOMException(
          'Storage quota exceeded.',
          'QuotaExceededError',
        );
      },
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Publish post',
      }),
    );

    expect(
      screen.getByText(MESSAGES.quotaExceeded),
    ).toBeInTheDocument();
    expect(titleInput).toHaveValue(title);
    expect(contentInput).toHaveValue(content);
    expect(
      screen.getByRole('button', {
        name: 'Publish post',
      }),
    ).toBeEnabled();
    expect(
      window.localStorage.getItem(STORAGE_KEYS.posts),
    ).toBeNull();
  });
});