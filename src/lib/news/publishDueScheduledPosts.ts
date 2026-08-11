import { getDb } from '@/lib/db/server';

type PublishDueScheduledPostsParams = {
  actorUserId?: string | null;
};

type PublishRpcRow = {
  post_id: string;
  slug: string;
  locale: string;
  scheduled_for: string;
  published_at: string;
};

export async function publishDueScheduledPosts(
  params: PublishDueScheduledPostsParams = {},
) {
  void params.actorUserId;

  const db = getDb();
  if (!db) {
    return { published: [] as PublishRpcRow[], error: null };
  }

  try {
    const published = (await db.query(
      `
        WITH due_posts AS (
          SELECT
            id,
            slug,
            locale,
            scheduled_for
          FROM news_posts
          WHERE status = 'scheduled'::news_status
            AND scheduled_for IS NOT NULL
            AND scheduled_for <= timezone('utc', now())
            AND archived_at IS NULL
          FOR UPDATE SKIP LOCKED
        ),
        updated_posts AS (
          UPDATE news_posts AS target
          SET
            status = 'published'::news_status,
            published_at = timezone('utc', now()),
            updated_at = timezone('utc', now())
          FROM due_posts
          WHERE target.id = due_posts.id
            AND target.status = 'scheduled'::news_status
          RETURNING
            target.id AS post_id,
            target.slug,
            target.locale,
            due_posts.scheduled_for,
            target.published_at
        )
        SELECT
          post_id,
          slug,
          locale,
          scheduled_for,
          published_at
        FROM updated_posts
      `
    )) as PublishRpcRow[];

    return {
      published,
      error: null,
    };
  } catch (error) {
    return { published: [] as PublishRpcRow[], error };
  }
}
