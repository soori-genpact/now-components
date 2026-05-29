import { createCustomElement } from '@servicenow/ui-core';
import snabbdom from '@servicenow/ui-renderer-snabbdom';
import '@servicenow/now-card/src/now-card';
import '@servicenow/now-icon/src/now-icon';
import styles from './styles.scss';

/* ------------------------------------------------------------------ *
 * x-gegis-library-metric-card
 * A configurable KPI / metric card for ServiceNow Next Experience.
 *
 * Per SERVICENOW_CUSTOM_COMPONENT_DEV_RULES.md §0/§5:
 *   - Standard component used for the container: now-card (border, shadow,
 *     click interaction + a11y) and now-icon for the icon.
 *   - DOCUMENTED EXCEPTIONS (no standard component matches the design spec,
 *     so these are owned typography/markup, styled in styles.scss):
 *       * the heading caption  (now-heading renders a fixed heading scale,
 *         not this small muted label),
 *       * the large KPI value  (no design-system "big number" component),
 *       * the trend pill        (now-highlighted-value has a fixed look /
 *         no size prop and cannot reproduce the soft-pink/red KPI pill).
 *
 * Public properties + now-ui.json config are unchanged.
 * ------------------------------------------------------------------ */

/* ---- Formatting helpers ---------------------------------------- */
const toNumber = (raw) => {
	if (raw === null || raw === undefined || raw === '') return NaN;
	if (typeof raw === 'number') return raw;
	const cleaned = String(raw).replace(/[^0-9.\-]/g, '');
	return cleaned === '' ? NaN : Number(cleaned);
};

const formatValue = ({ value, format, decimals, currencySymbol }) => {
	const num = toNumber(value);
	if (Number.isNaN(num)) return value === '' || value == null ? '—' : String(value);
	const places = Math.max(0, Number(decimals) || 0);
	const fixed = num.toLocaleString(undefined, { minimumFractionDigits: places, maximumFractionDigits: places });
	switch (format) {
		case 'percent': return `${fixed}%`;
		case 'currency': return `${currencySymbol || ''}${fixed}`;
		case 'number': return fixed;
		case 'none':
		default: return String(value);
	}
};

const resolveDirection = (direction, delta) => {
	if (direction && direction !== 'auto') return direction;
	if (Number.isNaN(delta) || delta === 0) return 'flat';
	return delta > 0 ? 'up' : 'down';
};

const resolveTone = (direction, positiveIsGood) => {
	if (direction === 'flat') return 'neutral';
	const isGood = direction === 'up' ? positiveIsGood : !positiveIsGood;
	return isGood ? 'good' : 'bad';
};

const ARROW = { up: '↑', down: '↓', flat: '→' };

/* ---- Trend pill (owned — documented exception) ----------------- */
const TrendPill = ({ trendValue, trendDirection, trendPeriod, trendPositiveIsGood, decimals }) => {
	const delta = toNumber(trendValue);
	if (Number.isNaN(delta)) return null;
	const direction = resolveDirection(trendDirection, delta);
	const tone = resolveTone(direction, trendPositiveIsGood);
	const places = Math.max(0, Number(decimals) || 0);
	const magnitude = Math.abs(delta).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: places });
	return (
		<div className="mc-trend">
			<span className={`mc-pill mc--${tone}`}>{ARROW[direction]} {magnitude}%</span>
			{trendPeriod ? <span className="mc-trend-period">{trendPeriod}</span> : null}
		</div>
	);
};

/* ---- Root view ------------------------------------------------- */
const view = (state) => {
	const { heading, icon, iconGlyph, iconColor, iconBackgroundColor, clickable } = state.properties;
	const valueText = formatValue(state.properties);

	const iconStyle = {};
	if (iconColor) iconStyle.color = iconColor;
	if (iconBackgroundColor) iconStyle.backgroundColor = iconBackgroundColor;

	let iconContent = null;
	if (iconGlyph) iconContent = <span className="mc-icon-glyph">{iconGlyph}</span>;
	else if (icon) iconContent = <now-icon icon={icon} size="lg"></now-icon>;

	return (
		<now-card
			className="mc-card"
			interaction={clickable ? 'click' : 'none'}
			configAria={clickable ? { button: { 'aria-label': heading || 'Metric card' } } : undefined}
		>
			<div className="mc-row">
				{iconContent ? (
					<div className="mc-icon" style={iconStyle} aria-hidden="true">{iconContent}</div>
				) : null}
				<div className="mc-body">
					{heading ? <div className="mc-heading">{heading}</div> : null}
					<div className="mc-value">{valueText}</div>
					{TrendPill(state.properties)}
				</div>
			</div>
		</now-card>
	);
};

createCustomElement('x-gegis-library-metric-card', {
	renderer: { type: snabbdom },
	view,
	styles,
	properties: {
		heading: { default: 'Submissions to Quote Ratio' },
		iconGlyph: { default: '$' },
		icon: { default: '' },
		iconColor: { default: '' },
		iconBackgroundColor: { default: '' },
		value: { default: '25' },
		format: { default: 'percent' },
		decimals: { default: 2 },
		currencySymbol: { default: '$' },
		trendValue: { default: '-4.2' },
		trendDirection: { default: 'auto' },
		trendPeriod: { default: 'MoM' },
		trendPositiveIsGood: { default: true },
		clickable: { default: false },
	},
	actionHandlers: {
		'NOW_CARD#CLICKED': ({ state, dispatch }) => {
			if (!state.properties.clickable) return;
			dispatch('METRIC_CARD_CLICKED', {
				heading: state.properties.heading,
				value: formatValue(state.properties),
			});
		},
	},
});
