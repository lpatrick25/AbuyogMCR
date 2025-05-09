import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PendingPage } from './pending.page';

describe('PendingPage', () => {
  let component: PendingPage;
  let fixture: ComponentFixture<PendingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PendingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
