import { Component } from '@angular/core';

// One spacing rule for projected buttons, links and compound action components.
@Component({
  selector: 'app-action-group',
  host: { class: 'action-group' },
  template: '<ng-content />'
})
export class ActionGroupComponent {}
