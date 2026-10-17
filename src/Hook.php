<?php

namespace Acms\Plugins\BlockEditorEmoji;

/**
 * Extension points (hooks).
 *
 * a-blog cms calls a same-named method on the attached hook object *if it exists*, at specific
 * points during request handling. See the bundled hook stub at extension/acms/Hook.php for the
 * full list of available hook methods and their signatures. Remove the methods you don't need.
 */
class Hook
{
    /**
     * Example: extend the template global variables.
     *
     * @param \Field $globalVars
     * @return void
     */
    public function extendsGlobalVars(\Field &$globalVars): void
    {
        // $globalVars->set('BLOCK_EDITOR_EMOJI_KEY', 'value');
    }

    /**
     * Example: add a custom cache rule.
     *
     * @param string $customRuleString
     * @return void
     */
    public function addCacheRule(string &$customRuleString): void
    {
        // $customRuleString = UA_GROUP; // e.g. vary the cache by device
    }

    /**
     * Called while the Twig Environment is being built.
     * Register Twig filters / functions / extensions here.
     *
     * @param \Acms\Services\Template\Twig $twig
     * @return void
     */
    public function extendsTwig(\Acms\Services\Template\Twig $twig): void
    {
        // $twig->registerFilter('jp_date', fn(string $iso) => date('Y-m-d', strtotime($iso)));
        // $twig->registerFunction('block_editor_emoji_label', [SampleService::class, 'label']);
        // $twig->registerExtension(new BlockEditorEmojiTwigExtension());
    }
}
