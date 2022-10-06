import { ComponentFixture, TestBed } from '@angular/core/testing';

import { B4uComponent } from './b4u.component';

describe('B4uComponent', () => {
  let component: B4uComponent;
  let fixture: ComponentFixture<B4uComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ B4uComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(B4uComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
