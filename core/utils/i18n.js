/*
 *Copyright (c) 2026 TQ-Systems GmbH <license@tq-group.com>, D-82229 Seefeld, Germany. All rights reserved.
 *Author: Ronny Freyer and the Energy Manager development team
 *
 *This software is licensed under the TQ-Systems Software License Agreement Version 1.0.4 or any later version.
 *You can obtain a copy of the License Agreement in the TQS (TQ-Systems Software Licenses) folder on the following website:
 *https://www.tq-group.com/en/support/downloads/tq-software-license-conditions/
 *In case of any license issues please contact license@tq-group.com.
 */

export function mergeTranslations(messages) {
  window.EMTranslations = window.EMTranslations || {}

  Object.keys(messages).forEach(lang => {
    window.EMTranslations[lang] = {
      ...(window.EMTranslations[lang] || {}),
      ...messages[lang]
    }
  })
}

export function setLanguageLabels(labels) {
  window.EMLanguageLabels = labels
}
