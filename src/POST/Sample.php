<?php

namespace Acms\Plugins\BlockEditorEmoji\POST;

use ACMS_POST;

/**
 * Example action (POST) module.
 *
 * Called from templates like a built-in POST module:
 *   <input type="submit" name="ACMS_POST_Sample" value="Send" />
 *
 * As with GET, keep the handler thin: move validation and persistence into Services / Validator
 * so they can be tested. The handler itself is not unit tested (CSRF/session/transaction bound).
 */
class Sample extends ACMS_POST
{
    public function post()
    {
        return $this->Post;
    }
}
