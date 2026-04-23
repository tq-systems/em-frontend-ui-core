/*
 *Copyright (c) 2026 TQ-Systems GmbH <license@tq-group.com>, D-82229 Seefeld, Germany. All rights reserved.
 *Author: Ronny Freyer and the Energy Manager development team
 *
 *This software is licensed under the TQ-Systems Software License Agreement Version 1.0.4 or any later version.
 *You can obtain a copy of the License Agreement in the TQS (TQ-Systems Software Licenses) folder on the following website:
 *https://www.tq-group.com/en/support/downloads/tq-software-license-conditions/
 *In case of any license issues please contact license@tq-group.com.
 */

export async function loadModules(modules, loaderFn) {
  const promises = modules.map(async (path) => {
    try {
      await loaderFn(path)
      await new Promise(resolve => setTimeout(resolve, 0))
    } catch (error) {
      console.error(`Error loading "${path}":`, error)
    }
  })

  await Promise.all(promises)
}
