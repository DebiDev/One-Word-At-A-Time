import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OneWordAtATimeComponent } from './one-word-at-atime.component';

describe('OneWordAtATimeComponent', () => {
  let component: OneWordAtATimeComponent;
  let fixture: ComponentFixture<OneWordAtATimeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OneWordAtATimeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OneWordAtATimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
