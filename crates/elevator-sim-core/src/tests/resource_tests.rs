use crate::events::EventChannel;
use crate::world::World;

#[test]
fn insert_and_get_resource() {
    let mut world = World::new();
    world.insert_resource(42_u32);
    assert_eq!(world.resource::<u32>(), Some(&42));
}

#[test]
fn resource_mut() {
    let mut world = World::new();
    world.insert_resource(10_i64);
    *world.resource_mut::<i64>().unwrap() += 5;
    assert_eq!(world.resource::<i64>(), Some(&15));
}

#[test]
fn remove_resource() {
    let mut world = World::new();
    world.insert_resource("hello".to_string());
    let removed = world.remove_resource::<String>();
    assert_eq!(removed, Some("hello".to_string()));
    assert!(world.resource::<String>().is_none());
}

#[test]
fn missing_resource_returns_none() {
    let world = World::new();
    assert!(world.resource::<f64>().is_none());
}

#[test]
fn event_channel_as_resource() {
    #[derive(Debug, PartialEq)]
    enum GameEvent {
        ScoreChanged(u32),
        LevelUp,
    }

    let mut world = World::new();
    world.insert_resource(EventChannel::<GameEvent>::new());

    // Emit events.
    world
        .resource_mut::<EventChannel<GameEvent>>()
        .unwrap()
        .emit(GameEvent::ScoreChanged(100));
    world
        .resource_mut::<EventChannel<GameEvent>>()
        .unwrap()
        .emit(GameEvent::LevelUp);

    // Peek.
    let ch = world.resource::<EventChannel<GameEvent>>().unwrap();
    assert_eq!(ch.len(), 2);
    assert!(!ch.is_empty());

    // Drain.
    let events = world
        .resource_mut::<EventChannel<GameEvent>>()
        .unwrap()
        .drain();
    assert_eq!(events.len(), 2);
    assert_eq!(events[0], GameEvent::ScoreChanged(100));
    assert_eq!(events[1], GameEvent::LevelUp);

    // Channel is now empty.
    let ch = world.resource::<EventChannel<GameEvent>>().unwrap();
    assert!(ch.is_empty());
}

#[test]
fn event_channel_default() {
    let ch = EventChannel::<i32>::default();
    assert!(ch.is_empty());
}
