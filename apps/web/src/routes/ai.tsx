import { createFileRoute } from '@tanstack/react-router';
import { CategoryPage } from '../components/CategoryPage';
import { useAiToolsPage } from '../lib/category';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/ai')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/ai', title: 'title_ai', desc: 'desc_ai', name: 'cat_ai_name' }),
	component: AiToolsPage,
});

function AiToolsPage() {
	const { copy, items } = useAiToolsPage();
	return <CategoryPage cat='ai' copy={copy} items={items} />;
}
