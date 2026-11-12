import { createFileRoute } from '@tanstack/react-router';
import { CategoryPage } from '../components/CategoryPage';
import { useTemplatesPage } from '../lib/category';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/templates')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/templates', title: 'title_templates', desc: 'desc_templates', name: 'cat_tpl_name' }),
	component: TemplatesPage,
});

function TemplatesPage() {
	const { copy, items } = useTemplatesPage();
	return <CategoryPage cat='template' copy={copy} items={items} />;
}
