import { beforeEach, describe, expect, it } from 'vitest';
import {
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage, {
  getLatestPosts,
} from './LandingPage.jsx';
import {
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

/**
 * Creates a valid stored post.
 *
 * @param {string} id Post identifier.
 * @param {string} title Post title.
 * @param {string} createdAt Post creation instant.
 * @returns {object}
 */
function createPost(id, title, createdAt) {
  return {
    id,
    title,
    content: `Browser-local content for ${title}.`,
    createdAt,
    authorId: userSession.userId,
    authorName: userSession.displayName,
  };
}

/**
 * Renders the landing page within its required router.
 *
 * @param {object|null} [session] Current browser session.
 * @returns {import('@testing-library/react').RenderResult}
 */
function renderLandingPage(session = null) {
  return render(
    <MemoryRouter>
      <LandingPage session={session} />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows guests accessible public navigation and required landing content', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.posts,
      JSON.stringify([
        createPost(
          'post-1',
          'A local story',
          '2026-10-14T10:00:00.000Z',
        ),
      ]),
    );

    renderLandingPage();

    const navigation = screen.getByRole('navigation', {
      name: 'Public navigation',
    });

    expect(
      within(navigation).getByRole('link', {
        name: 'WriteSpace home',
      }),
    ).toHaveAttribute('href', '/');
    expect(
      within(navigation).getByRole('link', {
        name: 'Log in',
      }),
    ).toHaveAttribute('href', '/login');
    expect(
      within(navigation).getByRole('link', {
        name: 'Register',
      }),
    ).toHaveAttribute('href', '/register');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Give your stories space to grow.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Everything you need to start writing',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Write with focus',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Build your collection',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Stay browser-local',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', {
        name: 'Footer navigation',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(MESSAGES.demoPrivacyWarning),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/WriteSpace\. Browser-local demo workspace\./),
    ).toBeInTheDocument();
  });

  it('shows authenticated landing actions for the current user', () => {
    renderLandingPage(userSession);

    const navigation = screen.getByRole('navigation', {
      name: 'Public navigation',
    });

    expect(
      within(navigation).getByText(userSession.displayName),
    ).toBeInTheDocument();
    expect(
      within(navigation).getByRole('link', {
        name: 'Dashboard',
      }),
    ).toHaveAttribute('href', '/blogs');
    expect(
      within(navigation).queryByRole('link', {
        name: 'Log in',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Go to dashboard',
      }),
    ).toHaveAttribute('href', '/blogs');
    expect(
      screen.getAllByRole('link', {
        name: 'Write a post',
      }),
    ).not.toHaveLength(0);
    expect(
      screen.getByRole('link', {
        name: 'View all posts',
      }),
    ).toHaveAttribute('href', '/blogs');
  });

  it('shows only the three newest posts to guests without management links', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.posts,
      JSON.stringify([
        createPost(
          'post-oldest',
          'Oldest story',
          '2026-10-10T10:00:00.000Z',
        ),
        createPost(
          'post-newest',
          'Newest story',
          '2026-10-14T10:00:00.000Z',
        ),
        createPost(
          'post-third',
          'Third newest story',
          '2026-10-12T10:00:00.000Z',
        ),
        createPost(
          'post-second',
          'Second newest story',
          '2026-10-13T10:00:00.000Z',
        ),
      ]),
    );

    renderLandingPage();

    const latestPostsHeading = screen.getByRole('heading', {
      name: 'Latest posts',
    });
    const latestPostsSection =
      latestPostsHeading.closest('section');
    const latestHeadings = within(
      latestPostsSection,
    ).getAllByRole('heading', { level: 2 });

    expect(
      latestHeadings.map((heading) => heading.textContent),
    ).toEqual([
      'Latest posts',
      'Newest story',
      'Second newest story',
      'Third newest story',
    ]);
    expect(
      screen.queryByText('Oldest story'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Read Newest story',
      }),
    ).toHaveAttribute('href', '/blog/post-newest');
    expect(
      screen.queryByRole('link', {
        name: 'View all posts',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: 'Edit Newest story',
      }),
    ).not.toBeInTheDocument();
  });

  it('shows a registration-gated empty state when no posts exist', () => {
    renderLandingPage();

    expect(
      screen.getByRole('heading', {
        name: 'No posts yet',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Be the first to write one!'),
    ).toBeInTheDocument();

    const accountLinks = screen.getAllByRole('link', {
      name: 'Create a demo account',
    });

    expect(accountLinks).not.toHaveLength(0);
    accountLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/register');
    });
  });

  it('shows an authenticated writing action in the empty state', () => {
    renderLandingPage(userSession);

    expect(
      screen.getByRole('heading', {
        name: 'No posts yet',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Write the first post',
      }),
    ).toHaveAttribute('href', '/write');
    expect(
      screen.queryByRole('link', {
        name: 'Create a demo account',
      }),
    ).not.toBeInTheDocument();
  });
});

describe('getLatestPosts', () => {
  it('returns the three newest posts without mutating the source collection', () => {
    const posts = [
      createPost(
        'post-1',
        'First',
        '2026-10-11T10:00:00.000Z',
      ),
      createPost(
        'post-4',
        'Fourth',
        '2026-10-14T10:00:00.000Z',
      ),
      createPost(
        'post-2',
        'Second',
        '2026-10-12T10:00:00.000Z',
      ),
      createPost(
        'post-3',
        'Third',
        '2026-10-13T10:00:00.000Z',
      ),
    ];
    const originalOrder = posts.map((post) => post.id);

    expect(
      getLatestPosts(posts).map((post) => post.id),
    ).toEqual(['post-4', 'post-3', 'post-2']);
    expect(posts.map((post) => post.id)).toEqual(
      originalOrder,
    );
  });

  it('returns an empty collection for a non-array value', () => {
    expect(getLatestPosts(null)).toEqual([]);
    expect(getLatestPosts({ posts: [] })).toEqual([]);
  });
});