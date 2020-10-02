import {Component, Input, OnInit} from '@angular/core';
import {Story} from '../../app.component';

@Component({
  selector: 'story',
  templateUrl: './story.component.html',
  styleUrls: ['./story.component.scss']
})
export class StoryComponent implements OnInit {

  @Input()
  story: Story;


  constructor() { }

  ngOnInit(): void {
  }

}
